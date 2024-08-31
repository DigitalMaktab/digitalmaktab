using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Intrinsics.X86;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "TeacherPolicy")]
    public class TeacherController(
        ITeacherRepository repository,
        ISchoolRepository schoolRepository,
        IStudentRepository studentRepository,
        IMapper mapper,
        IStringLocalizer<TeacherController> localizer,
        IStringLocalizer<MainController> mainLocalizer) : ControllerBase
    {
        private readonly ITeacherRepository repository = repository;
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly IMapper mapper = mapper;
        private readonly IStringLocalizer<TeacherController> localizer = localizer;
        private readonly IStringLocalizer<MainController> mainLocalizer = mainLocalizer;


        [HttpGet]
        public async Task<IActionResult> GetTeacher()
        {
            var id = Extensions.GetSessionDetails(this).Id;
            var teacher = await this.repository.GetTeacher(id);
            var teacherToReturn = this.mapper.Map<TeacherDto>(teacher);
            return Ok(teacherToReturn);
        }

        [HttpGet("schedules")]
        public async Task<IActionResult> GetSchedules([FromQuery] GeneralParams generalParams)
        {
            var id = Extensions.GetSessionDetails(this).Id;
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var headerParams = this.mapper.Map<UserParams>(generalParams);
            headerParams.CalendarYearId = calendarYearId;
            headerParams.TeacherId = id;

            var schedules = await this.schoolRepository.GetSchedules(headerParams);
            var schedulesToReturn = this.mapper.Map<ICollection<ScheduleDto>>(schedules);
            Response.AddPagintaion(schedules.CurrentPage, schedules.PageSize, schedules.TotalCount, schedules.TotalPages);
            return Ok(schedulesToReturn);
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetClassStudents([FromQuery] StudentParams studentParams)
        {
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var headerParams = this.mapper.Map<UserParams>(studentParams);
            headerParams.CalendarYearId = calendarYearId;

            var students = await this.studentRepository.GetStudents(schoolId, headerParams);
            var studentsToReturn = this.mapper.Map<ICollection<StudentDto>>(students);
            Response.AddPagintaion(students.CurrentPage, students.PageSize, students.TotalCount, students.TotalPages);
            return Ok(studentsToReturn);
        }

        [HttpPost("addAttendance")]
        public async Task<IActionResult> AddAttendance(AddAttendanceDto addAttendancesDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;

            foreach (AttendanceAddDto addAttendanceDto in addAttendancesDto.Attendances)
            {
                var dateTime = DateTime.Now;
                var attendance = await this.repository.GetAttendance(addAttendanceDto.EnrollmentId, dateTime);
                if (attendance == null)
                {
                    var attendanceToCreate = this.mapper.Map<Attendance>(addAttendanceDto);
                    attendanceToCreate.CreationUserId = id;
                    attendanceToCreate.UpdateUserId = id;
                    attendanceToCreate.DateTime = dateTime;

                    this.repository.Add(attendanceToCreate);

                }
                else
                {
                    attendance.Status = addAttendanceDto.Status;
                    attendance.UpdateUserId = id;
                    attendance.DateTime = dateTime;
                }
            }
            await this.repository.SaveAll();
            return Ok();
        }

        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendances([FromQuery] AttendanceParams attendanceParams)
        {
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var headerParams = this.mapper.Map<UserParams>(attendanceParams);
            headerParams.CalendarYearId = calendarYearId;
            var attendances = await this.repository.GetAttendances(headerParams);
            var attendancesToReturn = this.mapper.Map<ICollection<AttendanceDto>>(attendances);
            Response.AddPagintaion(attendances.CurrentPage, attendances.PageSize, attendances.TotalCount, attendances.TotalPages);
            return Ok(attendancesToReturn);
        }

        [HttpPost("addGrades")]
        public async Task<IActionResult> AddGrades(AddGradeDto addGradeDtos)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;

            foreach (GradeAddDto gradeDto in addGradeDtos.Grades)
            {
                var grade = await this.repository.GetGrade(gradeDto.EnrollmentId, gradeDto.ClassSubjectId, gradeDto.ExamType);
                if (grade == null)
                {
                    var attendanceToCreate = this.mapper.Map<Grade>(gradeDto);
                    attendanceToCreate.CreationUserId = id;
                    attendanceToCreate.UpdateUserId = id;

                    this.repository.Add(attendanceToCreate);
                }
                else
                {
                    grade.Score = gradeDto.Score;
                    grade.UpdateUserId = id;
                }
            }
            await this.repository.SaveAll();
            return Ok();
        }


        [HttpGet("grades")]
        public async Task<IActionResult> GetClassGrades([FromQuery] GradeParams attendanceParams)
        {
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var headerParams = this.mapper.Map<UserParams>(attendanceParams);
            headerParams.CalendarYearId = calendarYearId;
            var grades = await this.repository.GetGrades(headerParams);
            var gradesToReturn = this.mapper.Map<ICollection<GradeDto>>(grades);
            Response.AddPagintaion(grades.CurrentPage, grades.PageSize, grades.TotalCount, grades.TotalPages);
            return Ok(gradesToReturn);
        }


        [HttpPut("updatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto updatePasswordDto)
        {
            string email = Extensions.GetSessionDetails(this).Email;
            Teacher teacher = await this.repository.Authenticate(email, updatePasswordDto.CurrentPassword);

            if (teacher == null)
            {
                return BadRequest(mainLocalizer["InvalidCurrentPassword"].Value);
            }
            await this.repository.UpdatePassword(teacher, updatePasswordDto.NewPassword);
            return NoContent();
        }
    }
}