using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
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
        IMailService mailService
        ) : ControllerBase
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly ITeacherRepository teacherRepository = teacherRepository;
        private readonly IMapper mapper = mapper;
        private readonly IStringLocalizer<SchoolController> localizer = localizer;
        private readonly IMailService mailService = mailService;

        [HttpGet]
        public async Task<IActionResult> GetSchool()
        {
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var school = await schoolRepository.GetSchool(schoolId);
            var schoolToReturn = this.mapper.Map<SchoolDto>(school);
            return Ok(schoolToReturn);
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult> AddSchool([FromForm] SchoolForAddDto schoolForAddDto)
        {
            schoolForAddDto.Email = schoolForAddDto.Email.ToLower();
            if (await this.schoolRepository.Exists(schoolForAddDto.Email))
            {
                return BadRequest(this.localizer["SchoolExists"].Value);
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
                schoolId = Extensions.GetSessionDetails(this).SchoolId;
            }

            var school = await this.schoolRepository.GetSchool(schoolId.Value);
            await UpdateSchoolEntity(school, schoolForAddDto);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpPut("updatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto updatePasswordDto)
        {
            string email = Extensions.GetSessionDetails(this).Email;
            School school = await this.schoolRepository.Authenticate(email, updatePasswordDto.CurrentPassword);

            if (school == null)
            {
                return BadRequest(localizer["InvalidCurrentPassword"].Value);
            }
            await this.schoolRepository.UpdatePassword(school, updatePasswordDto.NewPassword);
            return NoContent();
        }

        [HttpPost("registerStudent")]
        public async Task<IActionResult> RegisterStudent(AddStudentDto studentDto)
        {
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;
            studentDto.Email = studentDto.Email.ToLower();
            if (await this.studentRepository.Exists(studentDto.Email))
            {
                return BadRequest(this.localizer["StudentExists"].Value);
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
                EmailSubject = this.localizer["AccountAccessSubject"],
                EmailBody = this.localizer["AccountDetails", studentName, studentDto.Email, studentPassword]
            };

            if (await this.mailService.SendMail(mailData))
            {
                var studentToCreate = this.mapper.Map<Student>(studentDto);
                studentToCreate.SchoolId = schoolId;
                studentToCreate.CreationUserId = schoolId;
                studentToCreate.UpdateUserId = schoolId;
                await this.studentRepository.Register(studentToCreate, studentPassword);
            }

            return StatusCode(201);
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents([FromQuery] UserParams userParams)
        {
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var students = await this.studentRepository.GetStudents(schoolId, userParams);
            var studentsToReturn = this.mapper.Map<ICollection<StudentDto>>(students);
            Response.AddPagintaion(students.CurrentPage, students.PageSize, students.TotalCount, students.TotalPages);
            return Ok(studentsToReturn);
        }


        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudent(Guid studentId)
        {
            var student = await this.studentRepository.GetStudent(studentId);
            var studentsToReturn = this.mapper.Map<StudentDto>(student);
            return Ok(studentsToReturn);
        }


        [HttpPost("addBranch")]
        public async Task<IActionResult> AddBranch(AddBranchDto branchDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;

            var branchToCreate = this.mapper.Map<Branch>(branchDto);
            branchToCreate.CreationUserId = id;
            branchToCreate.UpdateUserId = id;
            branchToCreate.SchoolId = schoolId;
            this.schoolRepository.Add(branchToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("branch/{branchId}")]
        public async Task<IActionResult> GetBranch(Guid branchId)
        {
            var branch = await this.schoolRepository.GetBranch(branchId);
            var branchToReturn = this.mapper.Map<BranchDto>(branch);
            return Ok(branchToReturn);
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches([FromQuery] UserParams userParams)
        {
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var branches = await this.schoolRepository.GetBranches(schoolId, userParams);
            var branchesToReturn = this.mapper.Map<ICollection<BranchDto>>(branches);
            Response.AddPagintaion(branches.CurrentPage, branches.PageSize, branches.TotalCount, branches.TotalPages);
            return Ok(branchesToReturn);
        }

        [HttpPost("registerTeacher")]
        public async Task<IActionResult> RegisterTeacher(AddTeacherDto teacherDto)
        {
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;
            teacherDto.Email = teacherDto.Email.ToLower();
            if (await this.teacherRepository.Exists(teacherDto.Email))
            {
                return BadRequest(this.localizer["TeacherExists"].Value);
            }

            string teacherPassword = Extensions.GeneratePassword(12);
            string teacherName = teacherDto.FirstName + " " + teacherDto.LastName;

            MailData mailData = new()
            {
                EmailToId = teacherDto.Email,
                EmailToName = teacherName,
                EmailSubject = this.localizer["AccountAccessSubject"],
                EmailBody = this.localizer["AccountDetails", teacherName, teacherDto.Email, teacherPassword]
            };

            if (await this.mailService.SendMail(mailData))
            {
                var teacherToCreate = this.mapper.Map<Teacher>(teacherDto);
                teacherToCreate.SchoolId = schoolId;
                teacherToCreate.CreationUserId = schoolId;
                teacherToCreate.UpdateUserId = schoolId;
                await this.teacherRepository.Register(teacherToCreate, teacherPassword);
            }

            return StatusCode(201);
        }

        [HttpGet("teachers")]
        public async Task<IActionResult> GetTeachers([FromQuery] UserParams userParams)
        {
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var teachers = await this.teacherRepository.GetTeachers(schoolId, userParams);
            var teachersToReturn = this.mapper.Map<ICollection<TeacherDto>>(teachers);
            Response.AddPagintaion(teachers.CurrentPage, teachers.PageSize, teachers.TotalCount, teachers.TotalPages);
            return Ok(teachersToReturn);
        }

        [HttpGet("teacher/{teacherId}")]
        public async Task<IActionResult> GetTeacher(Guid teacherId)
        {
            var teacher = await this.teacherRepository.GetTeacher(teacherId);
            var teacherToReturn = this.mapper.Map<TeacherDto>(teacher);
            return Ok(teacherToReturn);
        }

        [HttpPost("addClass")]
        public async Task<IActionResult> AddClass(AddClassDto classDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;

            var classToCreate = this.mapper.Map<Class>(classDto);
            classToCreate.CreationUserId = id;
            classToCreate.UpdateUserId = id;
            classToCreate.SchoolId = schoolId;
            this.schoolRepository.Add(classToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses([FromQuery] ClassParams classParams)
        {
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var classes = await this.schoolRepository.GetClasses(schoolId, classParams);
            var classesToReturn = this.mapper.Map<ICollection<ClassDto>>(classes);
            Response.AddPagintaion(classes.CurrentPage, classes.PageSize, classes.TotalCount, classes.TotalPages);
            return Ok(classesToReturn);
        }

        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetClass(Guid classId)
        {
            var classFromRepo = await this.schoolRepository.GetClass(classId);
            var classToReturn = this.mapper.Map<ClassDto>(classFromRepo);
            return Ok(classToReturn);
        }


        [HttpPost("addClassSubject")]
        public async Task<IActionResult> AddClassSubject(AddClassSubjectDto classSubjectDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;

            var classSubjectToCreate = this.mapper.Map<ClassSubject>(classSubjectDto);
            classSubjectToCreate.CreationUserId = id;
            classSubjectToCreate.UpdateUserId = id;

            this.schoolRepository.Add(classSubjectToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpPost("enroll")]
        public async Task<IActionResult> Enroll(AddEnrollmentDto enrollmentDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            if (await this.schoolRepository.IsSudentEnrolled(enrollmentDto.StudentId, enrollmentDto.CalendarYearId, enrollmentDto.ClassId))
            {
                return BadRequest(this.localizer["StudentIsEnrolled"].Value);
            }

            var enrollmentToCreate = this.mapper.Map<Enrollment>(enrollmentDto);
            enrollmentToCreate.CreationUserId = id;
            enrollmentToCreate.UpdateUserId = id;

            this.schoolRepository.Add(enrollmentToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("classStudents/{classId}/{calendarYearId}")]
        public async Task<IActionResult> GetClassStuddents(Guid classId, Guid calendarYearId, [FromQuery] UserParams userParams)
        {
            var enrollments = await this.schoolRepository.GetEnrollments(classId, calendarYearId, userParams);
            var enrollmentsToReturn = this.mapper.Map<ICollection<EnrollmentDto>>(enrollments);
            Response.AddPagintaion(enrollments.CurrentPage, enrollments.PageSize, enrollments.TotalCount, enrollments.TotalPages);
            return Ok(enrollmentsToReturn);
        }

        [HttpGet("classStudent/{enrollmentId}")]
        public async Task<IActionResult> GetClassStuddent(Guid enrollmentId)
        {
            var enrollment = await this.schoolRepository.GetEnrollment(enrollmentId);
            var enrollmentToReturn = this.mapper.Map<EnrollmentDto>(enrollment);
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
            Guid id = Extensions.GetSessionDetails(this).Id;
            if (await this.schoolRepository.IsScheduleExist(scheduleDto.ClassSubjectId, scheduleDto.TeacherId, scheduleDto.DayOfWeek, scheduleDto.ScheduleTime))
            {
                return BadRequest(this.localizer["SchedulExist"].Value);
            }

            var scheduleToCreate = this.mapper.Map<Schedule>(scheduleDto);
            scheduleToCreate.CreationUserId = id;
            scheduleToCreate.UpdateUserId = id;

            this.schoolRepository.Add(scheduleToCreate);
            await this.schoolRepository.SaveAll();
            return NoContent();
        }

        // Helper methods

        private async Task<School> PrepareSchoolEntity(SchoolForAddDto schoolForAddDto)
        {
            var school = this.mapper.Map<School>(schoolForAddDto);
            UploadResponse uploadResponse = await UploadLogo(schoolForAddDto.Logo, schoolForAddDto.Code);

            if (uploadResponse.Status == Status.SUCCESS)
            {
                school.Logo = uploadResponse.Path!;
            }

            return school;
        }

        private async Task UpdateSchoolEntity(School school, SchoolForAddDto schoolForAddDto)
        {
            this.mapper.Map(schoolForAddDto, school);
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