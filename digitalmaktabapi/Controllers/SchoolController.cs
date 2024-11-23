using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Dtos.SchoolDashboard;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services.Mail;
using digitalmaktabapi.Services.Upload;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "AdminPolicy")]
    public class SchoolController(
        ISchoolRepository schoolRepository,
        IStudentRepository studentRepository,
        ITeacherRepository teacherRepository,
        IMapper mapper,
        IStringLocalizer<SchoolController> localizer,
        IStringLocalizer<MainController> mainLocalizer,
        IMailService mailService
        ) : BaseController(mapper, localizer)
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly ITeacherRepository teacherRepository = teacherRepository;
        private readonly IStringLocalizer<MainController> mainLocalizer = mainLocalizer;
        private readonly IMailService mailService = mailService;

        [HttpGet]
        public async Task<IActionResult> GetSchool()
        {
            var school = await schoolRepository.GetSchool(this.SchoolId);
            var schoolToReturn = this.mapper!.Map<SchoolDto>(school);
            return Ok(schoolToReturn);
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult> AddSchool([FromForm] SchoolForAddDto schoolForAddDto)
        {
            schoolForAddDto.Email = schoolForAddDto.Email.ToLower();
            if (await this.schoolRepository.Exists(schoolForAddDto.Email))
            {
                return BadRequest(this.localizer!["SchoolExists"].Value);
            }
            var schoolToCreate = await PrepareSchoolEntity(schoolForAddDto);
            await this.schoolRepository.Register(schoolToCreate, schoolForAddDto.Password);
            return StatusCode(201);
        }

        [HttpPut("{schoolId?}")]
        public async Task<IActionResult> EditSchool(Guid? schoolId, [FromForm] SchoolForAddDto schoolForAddDto)
        {
            // If root user, the school Id should be passed, otherwise which is admin, it should get it from session.
            if (schoolId == null || schoolId == Guid.Empty)
            {
                schoolId = this.SchoolId;
            }

            var school = await this.schoolRepository.GetSchool(schoolId.Value);
            await UpdateSchoolEntity(school, schoolForAddDto);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpPut("updatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto updatePasswordDto)
        {

            School school = await this.schoolRepository.Authenticate(this.Email, updatePasswordDto.CurrentPassword);

            if (school == null)
            {
                return BadRequest(this.localizer!["InvalidCurrentPassword"].Value);
            }
            await this.schoolRepository.UpdatePassword(school, updatePasswordDto.NewPassword);
            return NoContent();
        }

        [HttpPost("registerStudent")]
        public async Task<IActionResult> RegisterStudent(AddStudentDto studentDto)
        {
            studentDto.Email = studentDto.Email.ToLower();
            if (await this.studentRepository.Exists(studentDto.Email))
            {
                return BadRequest(this.localizer!["StudentExists"].Value);
            }

            string studentPassword = Extensions.GeneratePassword(12);

            RequestHeader requestHeaders = Extensions.GetRequestHeaders(Request);
            string studentName = studentDto.FirstNameNative + " " + studentDto.LastNameNative;
            if (requestHeaders.AcceptLanguage != null && requestHeaders.AcceptLanguage.Equals("en-US"))
            {
                studentName = studentDto.FirstNameEnglish + " " + studentDto.LastNameEnglish;
            }
            MailData mailData = new()
            {
                EmailToId = studentDto.Email,
                EmailToName = studentName,
                EmailSubject = this.localizer!["AccountAccessSubject"],
                EmailBody = this.localizer!["AccountDetails", studentName, "<p>" + studentDto.Email + "</p>", "<p>" + studentPassword + "</p>"],
                EmailFooter = this.localizer!["EmailFooter"]
            };

            if (await this.mailService.SendMail(mailData))
            {
                var studentToCreate = this.mapper!.Map<Student>(studentDto);
                studentToCreate.SchoolId = this.SchoolId;
                studentToCreate.CreationUserId = this.SchoolId;
                studentToCreate.UpdateUserId = this.SchoolId;
                await this.studentRepository.Register(studentToCreate, studentPassword);
            }

            return StatusCode(201);
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents([FromQuery] UserParams userParams)
        {
            var students = await this.studentRepository.GetStudents(this.SchoolId, userParams);
            var studentsToReturn = this.mapper!.Map<ICollection<StudentDto>>(students);
            Response.AddPagintaion(students.CurrentPage, students.PageSize, students.TotalCount, students.TotalPages);
            return Ok(studentsToReturn);
        }


        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudent(Guid studentId)
        {
            var student = await this.studentRepository.GetStudent(studentId);
            var studentsToReturn = this.mapper!.Map<StudentDto>(student);
            return Ok(studentsToReturn);
        }


        [HttpPost("addBranch")]
        public async Task<IActionResult> AddBranch(AddBranchDto branchDto)
        {

            var branchToCreate = this.mapper!.Map<Branch>(branchDto);
            branchToCreate.CreationUserId = this.Id;
            branchToCreate.UpdateUserId = this.Id;
            branchToCreate.SchoolId = this.SchoolId;
            this.schoolRepository.Add(branchToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("branch/{branchId}")]
        public async Task<IActionResult> GetBranch(Guid branchId)
        {
            var branch = await this.schoolRepository.GetBranch(branchId);
            var branchToReturn = this.mapper!.Map<BranchDto>(branch);
            return Ok(branchToReturn);
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches([FromQuery] UserParams userParams)
        {
            var branches = await this.schoolRepository.GetBranches(this.SchoolId, userParams);
            var branchesToReturn = this.mapper!.Map<ICollection<BranchDto>>(branches);
            Response.AddPagintaion(branches.CurrentPage, branches.PageSize, branches.TotalCount, branches.TotalPages);
            return Ok(branchesToReturn);
        }

        [HttpPost("registerTeacher")]
        public async Task<IActionResult> RegisterTeacher(AddTeacherDto teacherDto)
        {
            teacherDto.Email = teacherDto.Email.ToLower();
            if (await this.teacherRepository.Exists(teacherDto.Email))
            {
                return BadRequest(this.localizer!["TeacherExists"].Value);
            }

            string teacherPassword = Extensions.GeneratePassword(12);
            string teacherName = teacherDto.FirstName + " " + teacherDto.LastName;

            MailData mailData = new()
            {
                EmailToId = teacherDto.Email,
                EmailToName = teacherName,
                EmailSubject = this.localizer!["AccountAccessSubject"],
                EmailBody = this.localizer!["AccountDetails", teacherName, "<p>" + teacherDto.Email + "</p>", "<p>" + teacherPassword + "</p>"],
                EmailFooter = this.localizer!["EmailFooter"]
            };

            if (await this.mailService.SendGrid(mailData))
            {
                var teacherToCreate = this.mapper!.Map<Teacher>(teacherDto);
                teacherToCreate.SchoolId = this.SchoolId;
                teacherToCreate.CreationUserId = this.SchoolId;
                teacherToCreate.UpdateUserId = this.SchoolId;
                await this.teacherRepository.Register(teacherToCreate, teacherPassword);
                return StatusCode(201);
            }
            return BadRequest(this.localizer!["FailedToCreateAccountDueToEmailSendingFailure"].Value);
        }

        [HttpGet("teachers")]
        public async Task<IActionResult> GetTeachers([FromQuery] UserParams userParams)
        {
            var teachers = await this.teacherRepository.GetTeachers(this.SchoolId, userParams);
            var teachersToReturn = this.mapper!.Map<ICollection<TeacherDto>>(teachers);
            Response.AddPagintaion(teachers.CurrentPage, teachers.PageSize, teachers.TotalCount, teachers.TotalPages);
            return Ok(teachersToReturn);
        }

        [HttpGet("teacher/{teacherId}")]
        public async Task<IActionResult> GetTeacher(Guid teacherId)
        {
            var teacher = await this.teacherRepository.GetTeacher(teacherId);
            var teacherToReturn = this.mapper!.Map<TeacherDto>(teacher);
            return Ok(teacherToReturn);
        }

        [HttpPost("addClass")]
        public async Task<IActionResult> AddClass(AddClassDto classDto)
        {

            var classToCreate = this.mapper!.Map<Class>(classDto);
            classToCreate.CreationUserId = this.Id;
            classToCreate.UpdateUserId = this.Id;
            classToCreate.SchoolId = this.SchoolId;
            classToCreate.CalendarYearId = this.CalendarYearId;
            this.schoolRepository.Add(classToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses([FromQuery] ClassParams classParams)
        {
            var classes = await this.schoolRepository.GetClasses(this.SchoolId, classParams);
            var classesToReturn = this.mapper!.Map<ICollection<ClassDto>>(classes);
            Response.AddPagintaion(classes.CurrentPage, classes.PageSize, classes.TotalCount, classes.TotalPages);
            return Ok(classesToReturn);
        }

        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetClass(Guid classId)
        {
            var classFromRepo = await this.schoolRepository.GetClass(classId);
            var classToReturn = this.mapper!.Map<ClassDto>(classFromRepo);
            return Ok(classToReturn);
        }


        [HttpPost("addClassSubject")]
        public async Task<IActionResult> AddClassSubject(AddClassSubjectDto classSubjectDto)
        {

            var classSubjectToCreate = this.mapper!.Map<ClassSubject>(classSubjectDto);
            classSubjectToCreate.CreationUserId = this.Id;
            classSubjectToCreate.UpdateUserId = this.Id;

            this.schoolRepository.Add(classSubjectToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpPost("enroll")]
        public async Task<IActionResult> Enroll(AddEnrollmentDto enrollmentDto)
        {
            if (await this.schoolRepository.IsSudentEnrolled(enrollmentDto.StudentId, enrollmentDto.CalendarYearId, enrollmentDto.ClassId))
            {
                return BadRequest(this.localizer!["StudentIsEnrolled"].Value);
            }

            var enrollmentToCreate = this.mapper!.Map<Enrollment>(enrollmentDto);
            enrollmentToCreate.CreationUserId = this.Id;
            enrollmentToCreate.UpdateUserId = this.Id;

            this.schoolRepository.Add(enrollmentToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("classStudents/{classId}/{calendarYearId}")]
        public async Task<IActionResult> GetClassStuddents(Guid classId, Guid calendarYearId, [FromQuery] UserParams userParams)
        {
            var enrollments = await this.schoolRepository.GetEnrollments(classId, calendarYearId, userParams);
            var enrollmentsToReturn = this.mapper!.Map<ICollection<EnrollmentDto>>(enrollments);
            Response.AddPagintaion(enrollments.CurrentPage, enrollments.PageSize, enrollments.TotalCount, enrollments.TotalPages);
            return Ok(enrollmentsToReturn);
        }

        [HttpGet("classStudent/{enrollmentId}")]
        public async Task<IActionResult> GetClassStuddent(Guid enrollmentId)
        {
            var enrollment = await this.schoolRepository.GetEnrollment(enrollmentId);
            var enrollmentToReturn = this.mapper!.Map<EnrollmentDto>(enrollment);
            return Ok(enrollmentToReturn);
        }

        [HttpDelete("withdraw/{id}")]
        public async Task<IActionResult> Withdraw(Guid id)
        {
            var enrollment = await this.schoolRepository.GetEnrollment(id);
            if (enrollment != null)
            {
                this.schoolRepository.Delete(enrollment);
                await this.schoolRepository.SaveAll();
            }
            return NoContent();
        }


        [HttpPost("addSchedule")]
        public async Task<IActionResult> AddSchedule(AddScheduleDto scheduleDto)
        {
            if (await this.schoolRepository.IsScheduleExist(this.CalendarYearId, scheduleDto.ClassSubjectId, scheduleDto.TeacherId, scheduleDto.DayOfWeek, scheduleDto.ScheduleTime))
            {
                return BadRequest(this.localizer!["SchedulExist"].Value);
            }

            var scheduleToCreate = this.mapper!.Map<Schedule>(scheduleDto);
            scheduleToCreate.CreationUserId = this.Id;
            scheduleToCreate.UpdateUserId = this.Id;

            this.schoolRepository.Add(scheduleToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("schedules")]
        public async Task<IActionResult> GetSchedules([FromQuery] ScheduleParams scheduleParams)
        {
            var headerParams = this.mapper!.Map<UserParams>(scheduleParams);
            headerParams.CalendarYearId = this.CalendarYearId;
            var schedules = await this.schoolRepository.GetSchedules(headerParams);
            var schedulesToReturn = this.mapper!.Map<ICollection<ScheduleDto>>(schedules);
            Response.AddPagintaion(schedules.CurrentPage, schedules.PageSize, schedules.TotalCount, schedules.TotalPages);
            var flattenedSchedules = FlattenSchedules(schedulesToReturn);
            return Ok(flattenedSchedules);
        }


        [NonAction]
        public List<FlattenedScheduleDto> FlattenSchedules(IEnumerable<ScheduleDto> schedules)
        {
            var flattenedSchedules = new List<FlattenedScheduleDto>();

            // Get all days of the week
            var allDaysOfWeek = Enum.GetValues(typeof(Models.DayOfWeek)).Cast<Models.DayOfWeek>();

            // Group schedules by DayOfWeek
            var groupedByDay = schedules.GroupBy(s => s.DayOfWeek).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var day in allDaysOfWeek)
            {
                // Create a new FlattenedScheduleDto for the current day with additional null checks
                var flattenedData = new FlattenedScheduleDto
                {
                    Day = this.mainLocalizer[day.ToString()].Value,
                    Hour1 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.FIRST)) : string.Empty,
                    Hour2 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.SECOND)) : string.Empty,
                    Hour3 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.THIRD)) : string.Empty,
                    Hour4 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.FOURTH)) : string.Empty,
                    Hour5 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.FIFTH)) : string.Empty,
                    Hour6 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.SIXTH)) : string.Empty,
                    Hour7 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.SEVENTH)) : string.Empty,
                    Hour8 = groupedByDay.ContainsKey(day) ? GetSubjectName(groupedByDay[day].FirstOrDefault(s => s.ScheduleTime == ScheduleTime.EIGHTTH)) : string.Empty
                };

                flattenedSchedules.Add(flattenedData);
            }

            return flattenedSchedules;
        }

        // Helper method to safely get the subject name with null checks
        private static string GetSubjectName(ScheduleDto schedule)
        {
            return schedule?.ClassSubject?.Subject?.SubjectName ?? string.Empty;
        }




        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData()
        {

            var classEnrollments = await this.schoolRepository.GetClassEnrollmentChart(this.SchoolId);

            var classEnrollmentChartDtos = this.mapper!.Map<List<ClassEnrollmentChartDto>>(classEnrollments);

            SchoolDashboardDto data = new()
            {
                TotalStudents = await this.schoolRepository.TotalStudents(this.SchoolId),
                TotalTeachers = await this.schoolRepository.TotalTeachers(this.SchoolId),
                TotalClasses = await this.schoolRepository.TotalClasses(this.SchoolId),
                TotalBranches = await this.schoolRepository.TotalBranches(this.SchoolId),
                GenderChart = await this.schoolRepository.GetGenderChart(this.SchoolId),
                TeachersGenderChart = await this.schoolRepository.GetTeachersGenderChart(this.SchoolId),
                ClassEnrollmentChart = classEnrollmentChartDtos
            };
            return Ok(data);
        }

        // Helper methods

        private async Task<School> PrepareSchoolEntity(SchoolForAddDto schoolForAddDto)
        {
            var school = this.mapper!.Map<School>(schoolForAddDto);
            UploadResponse uploadResponse = await UploadLogo(schoolForAddDto.Logo, schoolForAddDto.Code);

            if (uploadResponse.Status == Status.SUCCESS)
            {
                school.Logo = uploadResponse.Path!;
            }

            return school;
        }

        private async Task UpdateSchoolEntity(School school, SchoolForAddDto schoolForAddDto)
        {
            this.mapper!.Map(schoolForAddDto, school);
            UploadResponse uploadResponse = await UploadLogo(schoolForAddDto.Logo, schoolForAddDto.Code);

            if (uploadResponse.Status == Status.SUCCESS)
            {
                school.Logo = uploadResponse.Path!;
            }
        }

        private static async Task<UploadResponse> UploadLogo(IFormFile? file, int code)
        {
            UploadResponse uploadResponse = new() { Status = Status.FAILURE };
            if (file != null && file.Length > 0)
            {
                uploadResponse = await UploadService.Upload(file, code.ToString());
            }
            return uploadResponse;
        }
    }
}