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
        IStringLocalizer<TeacherController> localizer) : ControllerBase
    {
        private readonly ITeacherRepository repository = repository;
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly IMapper mapper = mapper;
        private readonly IStringLocalizer<TeacherController> localizer = localizer;


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
        public async Task<IActionResult> AddAttendance(ICollection<AddAttendanceDto> addAttendancesDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;

            foreach (AddAttendanceDto addAddressDto in addAttendancesDto)
            {
                var dateTime = DateTime.Now;
                if (!await this.repository.IsAttendanceExists(addAddressDto.EnrollmentId, dateTime))
                {
                    var attendanceToCreate = this.mapper.Map<Attendance>(addAddressDto);
                    attendanceToCreate.CreationUserId = id;
                    attendanceToCreate.UpdateUserId = id;
                    attendanceToCreate.DateTime = dateTime;

                    this.repository.Add(attendanceToCreate);

                }
            }
            await this.repository.SaveAll();
            return Ok();
        }

        [HttpGet("attendance")]
        public async Task<IActionResult> GetClassStudents([FromQuery] AttendanceParams attendanceParams)
        {
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var schoolId = Extensions.GetSessionDetails(this).SchoolId;


            var headerParams = this.mapper.Map<UserParams>(attendanceParams);

            var attendances = await this.repository.GetAttendances(headerParams);
            var attendancesToReturn = this.mapper.Map<ICollection<AttendanceDto>>(attendances);
            Response.AddPagintaion(attendances.CurrentPage, attendances.PageSize, attendances.TotalCount, attendances.TotalPages);
            return Ok(attendancesToReturn);
        }
    }
}