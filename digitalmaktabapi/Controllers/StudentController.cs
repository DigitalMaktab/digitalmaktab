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

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "StudentPolicy")]
    public class StudentController(
        IStudentRepository studentRepository,
        ISchoolRepository schoolRepository,
        IMapper mapper) : ControllerBase
    {
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IMapper mapper = mapper;


        [HttpGet]
        public async Task<IActionResult> GetStudent()
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            var student = await studentRepository.GetStudent(id);
            var studentToReturn = this.mapper.Map<StudentDto>(student);
            return Ok(studentToReturn);
        }

        [HttpGet("class")]
        public async Task<IActionResult> GetClass()
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            Guid calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;

            var classFromRepo = await this.studentRepository.GetStudentClass(id, calendarYearId);
            var classToReturn = this.mapper.Map<ClassDto>(classFromRepo);

            return Ok(classToReturn);
        }

        [HttpGet("schedules")]
        public async Task<IActionResult> GetSchedules([FromQuery] ScheduleParams scheduleParams)
        {
            var id = Extensions.GetSessionDetails(this).Id;
            var calendarYearId = Extensions.GetSessionDetails(this).CalendarYearId;
            var headerParams = this.mapper.Map<UserParams>(scheduleParams);
            headerParams.CalendarYearId = calendarYearId;
            headerParams.ClassId = scheduleParams.ClassId;

            var schedules = await this.schoolRepository.GetSchedules(headerParams);
            var schedulesToReturn = this.mapper.Map<ICollection<ScheduleDto>>(schedules);
            Response.AddPagintaion(schedules.CurrentPage, schedules.PageSize, schedules.TotalCount, schedules.TotalPages);
            return Ok(schedulesToReturn);
        }
    }
}