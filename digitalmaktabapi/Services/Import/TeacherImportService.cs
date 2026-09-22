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
    public class TeacherImportService(
        DataContext context,
        ITeacherRepository teacherRepository,
        IStringLocalizer<SchoolController> localizer)
    {
        private readonly DataContext context = context;
        private readonly ITeacherRepository teacherRepository = teacherRepository;
        private readonly IStringLocalizer<SchoolController> localizer = localizer;

        private string L(string key) => this.localizer[key].Value;
        private string L(string key, params object[] args) => this.localizer[key, args].Value;

        private static readonly string[] RequiredHeaders =
        [
            "FirstName", "LastName", "DateOfBirth", "Gender",
            "Email", "Phone", "UserRole"
        ];

        private static readonly string[] OptionalHeaders =
        [
            "AddressStreet", "AddressVillage", "AddressRegion"
        ];

        // Only these UserRole values make sense for a teacher import.
        private static readonly UserRole[] AllowedRoles =
        [
            UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.HEAD_MASTER
        ];

        public byte[] BuildTemplate()
        {
            using var wb = new XLWorkbook();

            var sheet = wb.AddWorksheet("Teachers");
            var allHeaders = RequiredHeaders.Concat(OptionalHeaders).ToArray();
            for (int i = 0; i < allHeaders.Length; i++)
            {
                var cell = sheet.Cell(1, i + 1);
                cell.Value = allHeaders[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            }
            sheet.Columns().AdjustToContents();

            var refSheet = wb.AddWorksheet("Reference");
            int row = 1;
            AddEnumBlock(refSheet, ref row, "UserRole", AllowedRoles.Select(r => r.ToString()).ToArray());
            AddEnumBlock(refSheet, ref row, "Gender", Enum.GetNames<Gender>());
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
            Stream fileStream, Guid schoolId, Guid actorId)
        {
            var result = new ImportResultDto();

            var afghanistan = await context.Countries.FirstOrDefaultAsync(c => c.CountryCode == "AF")
                ?? throw new InvalidOperationException(L("ImportCountryAfNotSeeded"));

            using var wb = new XLWorkbook(fileStream);
            var sheet = wb.Worksheet(1);
            var used = sheet.RangeUsed();
            if (used == null)
            {
                result.Errors.Add(new ImportError { Row = 0, Message = L("ImportEmptySheet") });
                return result;
            }

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
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "Email", Message = L("ImportEmailRequired") });
                        result.SkippedCount++;
                        continue;
                    }
                    if (await teacherRepository.Exists(email))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "Email", Message = L("ImportTeacherEmailExists", email) });
                        result.SkippedCount++;
                        continue;
                    }

                    if (!TryParseEnum<Gender>(Get("Gender"), out var gender))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "Gender", Message = L("ImportInvalidEnum", Get("Gender"), "Gender") });
                        result.SkippedCount++;
                        continue;
                    }

                    if (!TryParseEnum<UserRole>(Get("UserRole"), out var userRole))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "UserRole", Message = L("ImportInvalidEnum", Get("UserRole"), "UserRole") });
                        result.SkippedCount++;
                        continue;
                    }
                    if (!AllowedRoles.Contains(userRole))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "UserRole", Message = L("ImportTeacherRoleNotAllowed", userRole.ToString()) });
                        result.SkippedCount++;
                        continue;
                    }

                    if (!DateTime.TryParse(Get("DateOfBirth"), out var dob))
                    {
                        result.Errors.Add(new ImportError { Row = rowNum, Field = "DateOfBirth", Message = L("ImportInvalidDate", Get("DateOfBirth")) });
                        result.SkippedCount++;
                        continue;
                    }
                    var dateOnly = DateOnly.FromDateTime(dob);

                    var street  = NullIfEmpty(Get("AddressStreet"));
                    var village = NullIfEmpty(Get("AddressVillage"));
                    var region  = NullIfEmpty(Get("AddressRegion"));

                    var firstName = Get("FirstName");
                    var lastName = Get("LastName");
                    var password = Extensions.GeneratePassword(10);

                    var teacher = new Teacher
                    {
                        SchoolId = schoolId,
                        School = null!,
                        FirstName = firstName,
                        LastName = lastName,
                        DateOfBirth = dateOnly,
                        Gender = gender,
                        PrimaryAddress = new Address
                        {
                            Street = street,
                            Village = village,
                            Region = region
                        },
                        PhoneNumber = new PhoneNumber
                        {
                            CountryId = afghanistan.Id,
                            Country = null!,
                            Number = Get("Phone")
                        },
                        Email = email,
                        UserRole = userRole,
                        PasswordHash = [],
                        PasswordSalt = [],
                        Status = true,
                        CreationUserId = actorId,
                        UpdateUserId = actorId,
                        Schedules = [],
                        Classes = []
                    };

                    await teacherRepository.Register(teacher, password);

                    result.CreatedCount++;
                    result.GeneratedPasswords.Add(new ImportCredential
                    {
                        Email = email,
                        FirstName = firstName,
                        LastName = lastName,
                        Password = password
                    });
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new ImportError { Row = rowNum, Message = L("ImportUnexpectedError", ex.Message) });
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
