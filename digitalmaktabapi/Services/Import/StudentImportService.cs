using ClosedXML.Excel;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Services.Import
{
    public class StudentImportService(
        DataContext context,
        IStudentRepository studentRepository,
        IStringLocalizer<SchoolController> localizer)
    {
        private readonly DataContext context = context;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly IStringLocalizer<SchoolController> localizer = localizer;

        private string L(string key) => this.localizer[key].Value;
        private string L(string key, params object[] args) => this.localizer[key, args].Value;

        // Header names — case-insensitive match against row 1 of the uploaded sheet.
        // Required columns must all be present for the sheet to parse.
        private static readonly string[] RequiredHeaders =
        [
            "FirstNameNative", "LastNameNative", "FatherNameNative", "GrandFatherNameNative",
            "FirstNameEnglish", "LastNameEnglish", "FatherNameEnglish", "GrandFatherNameEnglish",
            "AsasNumber", "DateOfBirth", "Gender", "Email", "Phone",
            "ClassName", "BranchName", "MotherTongue", "JoiningAge"
        ];

        private static readonly string[] OptionalHeaders =
        [
            "DisabilityType", "IsOrphan", "BloodGroup", "MonthlyFee",
            "AddressStreet", "AddressVillage", "AddressRegion"
        ];

        public async Task<byte[]> BuildTemplateAsync(Guid schoolId, Guid calendarYearId)
        {
            var classes = await context.Classes
                .Where(c => c.SchoolId == schoolId && c.CalendarYearId == calendarYearId)
                .Include(c => c.Branch)
                .OrderBy(c => c.Branch.BranchName).ThenBy(c => c.ClassName)
                .ToListAsync();

            using var wb = new XLWorkbook();

            // Sheet 1: Students template
            var sheet = wb.AddWorksheet("Students");
            var allHeaders = RequiredHeaders.Concat(OptionalHeaders).ToArray();
            for (int i = 0; i < allHeaders.Length; i++)
            {
                var cell = sheet.Cell(1, i + 1);
                cell.Value = allHeaders[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            }
            sheet.Columns().AdjustToContents();

            // Sheet 2: Reference — enum values + this school's classes.
            // Header row labels are localized based on the request's Accept-Language;
            // the parser matches column names on Sheet 1, which stay in English internally.
            var refSheet = wb.AddWorksheet("Reference");
            refSheet.Cell(1, 1).Value = L("ImportTemplateSectionAvailableClasses");
            refSheet.Cell(1, 1).Style.Font.Bold = true;
            refSheet.Cell(2, 1).Value = L("ImportTemplateColumnClassName");
            refSheet.Cell(2, 2).Value = L("ImportTemplateColumnBranchName");
            refSheet.Cell(2, 1).Style.Font.Bold = true;
            refSheet.Cell(2, 2).Style.Font.Bold = true;
            for (int i = 0; i < classes.Count; i++)
            {
                refSheet.Cell(3 + i, 1).Value = classes[i].ClassName.ToString();
                refSheet.Cell(3 + i, 2).Value = classes[i].Branch.BranchName;
            }

            int enumRow = 3 + classes.Count + 2;
            AddEnumBlock(refSheet, ref enumRow, "Gender", Enum.GetNames<Gender>());
            AddEnumBlock(refSheet, ref enumRow, "MotherTongue", Enum.GetNames<Language>());
            AddEnumBlock(refSheet, ref enumRow, "DisabilityType", Enum.GetNames<DisabilityType>());
            AddEnumBlock(refSheet, ref enumRow, "IsOrphan", Enum.GetNames<IsOrphan>());
            AddEnumBlock(refSheet, ref enumRow, "BloodGroup", Enum.GetNames<BloodGroup>());
            refSheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            return stream.ToArray();
        }

        private static void AddEnumBlock(IXLWorksheet sheet, ref int row, string label, string[] values)
        {
            sheet.Cell(row, 1).Value = label;
            sheet.Cell(row, 1).Style.Font.Bold = true;
            row++;
            foreach (var v in values)
            {
                sheet.Cell(row, 1).Value = v;
                row++;
            }
            row++;
        }

        public async Task<ImportResultDto> ImportAsync(
            Stream fileStream, Guid schoolId, Guid calendarYearId, Guid actorId)
        {
            var result = new ImportResultDto();

            // Preload lookups
            var afghanistan = await context.Countries.FirstOrDefaultAsync(c => c.CountryCode == "AF")
                ?? throw new InvalidOperationException(L("ImportCountryAfNotSeeded"));
            var classes = await context.Classes
                .Where(c => c.SchoolId == schoolId && c.CalendarYearId == calendarYearId)
                .Include(c => c.Branch)
                .ToListAsync();

            using var wb = new XLWorkbook(fileStream);
            var sheet = wb.Worksheet(1);
            var used = sheet.RangeUsed();
            if (used == null)
            {
                result.Errors.Add(new ImportError { Row = 0, Message = L("ImportEmptySheet") });
                return result;
            }

            // Header → column index (case-insensitive)
            var headers = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var headerRow = used.FirstRow();
            for (int col = 1; col <= headerRow.CellCount(); col++)
            {
                var name = headerRow.Cell(col).GetString().Trim();
                if (!string.IsNullOrEmpty(name)) headers[name] = col;
            }

            foreach (var required in RequiredHeaders)
            {
                if (!headers.ContainsKey(required))
                {
                    result.Errors.Add(new ImportError
                    {
                        Row = 1,
                        Field = required,
                        Message = L("ImportMissingRequiredColumn", required)
                    });
                }
            }
            if (result.Errors.Count > 0) return result;

            int lastRow = used.LastRow().RowNumber();
            for (int rowNum = 2; rowNum <= lastRow; rowNum++)
            {
                var row = sheet.Row(rowNum);
                if (row.IsEmpty()) continue;

                result.TotalRows++;

                string Get(string col) => headers.TryGetValue(col, out var idx)
                    ? row.Cell(idx).GetString().Trim()
                    : string.Empty;

                var email = Get("Email").ToLowerInvariant();

                try
                {
                    // Resolve joining class from ClassName + BranchName
                    var classNameStr = Get("ClassName");
                    var branchNameStr = Get("BranchName");
                    if (!Enum.TryParse<ClassName>(classNameStr, ignoreCase: true, out var className))
                    {
                        result.Errors.Add(new ImportError
                        {
                            Row = rowNum, Field = "ClassName",
                            Message = L("ImportUnknownClassName", classNameStr)
                        });
                        result.SkippedCount++;
                        continue;
                    }
                    var joiningClass = classes.FirstOrDefault(c =>
                        c.ClassName == className &&
                        string.Equals(c.Branch.BranchName, branchNameStr, StringComparison.OrdinalIgnoreCase));
                    if (joiningClass == null)
                    {
                        result.Errors.Add(new ImportError
                        {
                            Row = rowNum, Field = "ClassName/BranchName",
                            Message = L("ImportClassNotFound", classNameStr, branchNameStr)
                        });
                        result.SkippedCount++;
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(email))
                    {
                        result.Errors.Add(new ImportError
                        {
                            Row = rowNum, Field = "Email", Message = L("ImportEmailRequired")
                        });
                        result.SkippedCount++;
                        continue;
                    }
                    if (await studentRepository.Exists(email))
                    {
                        result.Errors.Add(new ImportError
                        {
                            Row = rowNum, Field = "Email",
                            Message = L("ImportEmailExists", email)
                        });
                        result.SkippedCount++;
                        continue;
                    }

                    if (!TryParseEnum<Gender>(Get("Gender"), out var gender))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "Gender", Message = L("ImportInvalidEnum", Get("Gender"), "Gender") });
                        result.SkippedCount++;
                        continue;
                    }
                    if (!TryParseEnum<Language>(Get("MotherTongue"), out var motherTongue))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "MotherTongue", Message = L("ImportInvalidEnum", Get("MotherTongue"), "MotherTongue") });
                        result.SkippedCount++;
                        continue;
                    }

                    var disabilityStr = Get("DisabilityType");
                    var disability = string.IsNullOrEmpty(disabilityStr) ? DisabilityType.NO_DISABILITY
                        : (TryParseEnum<DisabilityType>(disabilityStr, out var d) ? d : DisabilityType.NO_DISABILITY);

                    var orphanStr = Get("IsOrphan");
                    var isOrphan = string.IsNullOrEmpty(orphanStr) ? IsOrphan.NOT_ORPHAN
                        : (TryParseEnum<IsOrphan>(orphanStr, out var o) ? o : IsOrphan.NOT_ORPHAN);

                    BloodGroup? bloodGroup = null;
                    var bloodStr = Get("BloodGroup");
                    if (!string.IsNullOrEmpty(bloodStr) && TryParseEnum<BloodGroup>(bloodStr, out var bg))
                        bloodGroup = bg;

                    if (!DateTime.TryParse(Get("DateOfBirth"), out var dob))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "DateOfBirth", Message = L("ImportInvalidDate", Get("DateOfBirth")) });
                        result.SkippedCount++;
                        continue;
                    }
                    dob = DateTime.SpecifyKind(dob, DateTimeKind.Utc);

                    if (!int.TryParse(Get("AsasNumber"), out var asasNumber))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "AsasNumber", Message = L("ImportInvalidInteger", Get("AsasNumber"), "AsasNumber") });
                        result.SkippedCount++;
                        continue;
                    }
                    if (!int.TryParse(Get("JoiningAge"), out var joiningAge))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "JoiningAge", Message = L("ImportInvalidInteger", Get("JoiningAge"), "JoiningAge") });
                        result.SkippedCount++;
                        continue;
                    }

                    decimal? monthlyFee = null;
                    if (decimal.TryParse(Get("MonthlyFee"), out var fee)) monthlyFee = fee;

                    var street  = NullIfEmpty(Get("AddressStreet"));
                    var village = NullIfEmpty(Get("AddressVillage"));
                    var region  = NullIfEmpty(Get("AddressRegion"));

                    // Two separate instances — EF Core owned entities cannot be shared.
                    Address MakeAddress() => new()
                    {
                        Street = street,
                        Village = village,
                        Region = region
                    };

                    var password = Extensions.GeneratePassword(10);

                    var student = new Student
                    {
                        SchoolId = schoolId,
                        School = null!,
                        FirstNameNative = Get("FirstNameNative"),
                        LastNameNative = Get("LastNameNative"),
                        FatherNameNative = Get("FatherNameNative"),
                        GrandFatherNameNative = Get("GrandFatherNameNative"),
                        FirstNameEnglish = Get("FirstNameEnglish"),
                        LastNameEnglish = Get("LastNameEnglish"),
                        FatherNameEnglish = Get("FatherNameEnglish"),
                        GrandFatherNameEnglish = Get("GrandFatherNameEnglish"),
                        AsasNumber = asasNumber,
                        CalendarYearId = calendarYearId,
                        JoiningYear = null!,
                        JoiningAge = joiningAge,
                        JoiningClassId = joiningClass.Id,
                        JoiningClass = null!,
                        PrimaryAddress = MakeAddress(),
                        SecondaryAddress = MakeAddress(),
                        PhoneNumber = new PhoneNumber
                        {
                            CountryId = afghanistan.Id,
                            Country = null!,
                            Number = Get("Phone")
                        },
                        BloodGroup = bloodGroup,
                        DisabilityType = disability,
                        IsOrphan = isOrphan,
                        MotherTongue = motherTongue,
                        DateOfBirth = dob,
                        Gender = gender,
                        Email = email,
                        UserRole = UserRole.STUDENT,
                        MonthlyFee = monthlyFee,
                        PasswordHash = [],
                        PasswordSalt = [],
                        Status = true,
                        CreationUserId = actorId,
                        UpdateUserId = actorId,
                        Attendances = [],
                        Schedules = [],
                        Fees = [],
                        Enrollments = []
                    };

                    await studentRepository.Register(student, password);

                    // Enroll into the joining class for the active calendar year
                    var enrollment = new Enrollment
                    {
                        StudentId = student.Id,
                        Student = null!,
                        ClassId = joiningClass.Id,
                        Class = null!,
                        CalendarYearId = calendarYearId,
                        CalendarYear = null!,
                        CreationUserId = actorId,
                        UpdateUserId = actorId,
                        Status = true
                    };
                    context.Enrollments.Add(enrollment);
                    await context.SaveChangesAsync();

                    result.CreatedCount++;
                    result.GeneratedPasswords.Add(new ImportCredential
                    {
                        Email = email,
                        FirstName = student.FirstNameEnglish,
                        LastName = student.LastNameEnglish,
                        Password = password
                    });
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new ImportError
                    {
                        Row = rowNum,
                        Message = L("ImportUnexpectedError", ex.Message)
                    });
                    result.SkippedCount++;
                }
            }

            return result;
        }

        private static bool TryParseEnum<T>(string value, out T result) where T : struct, Enum
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                result = default;
                return false;
            }
            return Enum.TryParse(value.Trim(), ignoreCase: true, out result);
        }

        private static string? NullIfEmpty(string s) => string.IsNullOrWhiteSpace(s) ? null : s;
    }
}
