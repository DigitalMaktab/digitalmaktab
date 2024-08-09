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
    // [Authorize(Policy = "RootUserPolicy")]
    [Authorize(Policy = "AdminPolicy")]
    //TODO: Replace to RootUserPolicy when root user is ready, now it is used only for adding.
    public class RootController(
        IRootRepository rootRepository,
        ISchoolRepository schoolRepository,
        IMapper mapper) : ControllerBase
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IRootRepository rootRepository = rootRepository;
        private readonly IMapper mapper = mapper;

        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools([FromQuery] UserParams userParams)
        {
            var schools = await this.schoolRepository.GetSchools(userParams);
            var schoolsToReturn = this.mapper.Map<ICollection<SchoolDto>>(schools);
            return Ok(schoolsToReturn);
        }

        [HttpPost("addCalendarYear")]
        public async Task<IActionResult> AddCalendaryYear(AddCalendarYearDto calendarYearDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            var calendarYearToCreate = this.mapper.Map<CalendarYear>(calendarYearDto);
            calendarYearToCreate.CreationUserId = id;
            calendarYearToCreate.UpdateUserId = id;
            this.rootRepository.Add(calendarYearToCreate);
            await this.rootRepository.SaveAll();
            return NoContent();
        }
    }
}