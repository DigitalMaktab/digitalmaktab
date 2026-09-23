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
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "StudentPolicy")]
    public class StudentController(
        IStudentRepository studentRepository,
        ISchoolRepository schoolRepository,
        ITeacherRepository teacherRepository,
        IStringLocalizer<MainController> mainLocalizer,
        IMapper mapper) : BaseController(mapper, mainLocalizer)
    {
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly ITeacherRepository teacherRepository = teacherRepository;


        [HttpGet]
        public async Task<IActionResult> GetStudent()
        {
            var student = await studentRepository.GetStudent(this.Id);
            var studentToReturn = this.mapper!.Map<StudentDto>(student);
            return Ok(studentToReturn);
        }

        [HttpGet("class")]
        public async Task<IActionResult> GetClass()
        {

            var classFromRepo = await this.studentRepository.GetStudentClass(this.Id, this.CalendarYearId);
            var classToReturn = this.mapper!.Map<ClassDto>(classFromRepo);

            return Ok(classToReturn);
        }

        [HttpGet("schedules")]
        public async Task<IActionResult> GetSchedules([FromQuery] ScheduleParams scheduleParams)
        {
            var headerParams = this.mapper!.Map<UserParams>(scheduleParams);
            headerParams.CalendarYearId = this.CalendarYearId;
            headerParams.ClassId = scheduleParams.ClassId;

            var schedules = await this.schoolRepository.GetSchedules(headerParams);
            var schedulesToReturn = this.mapper!.Map<ICollection<ScheduleDto>>(schedules);
            Response.AddPagintaion(schedules.CurrentPage, schedules.PageSize, schedules.TotalCount, schedules.TotalPages);
            return Ok(schedulesToReturn);
        }

        [HttpGet("grades")]
        public async Task<IActionResult> GetClassGrades([FromQuery] GradeParams attendanceParams)
        {
            var headerParams = this.mapper!.Map<UserParams>(attendanceParams);
            headerParams.CalendarYearId = this.CalendarYearId;
            var grades = await this.teacherRepository.GetGrades(headerParams);
            var gradesToReturn = this.mapper!.Map<ICollection<GradeDto>>(grades);
            Response.AddPagintaion(grades.CurrentPage, grades.PageSize, grades.TotalCount, grades.TotalPages);
            return Ok(gradesToReturn);
        }

        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendances([FromQuery] AttendanceParams attendanceParams)
        {
            var headerParams = this.mapper!.Map<UserParams>(attendanceParams);
            headerParams.CalendarYearId = this.CalendarYearId;
            var attendances = await this.teacherRepository.GetAttendances(headerParams);
            var attendancesToReturn = this.mapper!.Map<ICollection<AttendanceDto>>(attendances);
            Response.AddPagintaion(attendances.CurrentPage, attendances.PageSize, attendances.TotalCount, attendances.TotalPages);
            return Ok(attendancesToReturn);
        }


        [HttpPut("updatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto updatePasswordDto)
        {
            Student student = await this.studentRepository.Authenticate(this.Email, updatePasswordDto.CurrentPassword);

            if (student == null)
            {
                return BadRequest(mainLocalizer["InvalidCurrentPassword"].Value);
            }
            await this.studentRepository.UpdatePassword(student, updatePasswordDto.NewPassword);
            return NoContent();
        }
    }
}