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
using digitalmaktabapi.Services.Upload;
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

        [HttpPost("addBook")]
        public async Task<IActionResult> AddBook([FromForm] AddRootBookDto addRootBookDto)
        {
            UploadResponse uploadResponse = await UploadService.Upload(addRootBookDto.File, "books");
            if (uploadResponse.Status == Status.SUCCESS)
            {
                Guid id = Extensions.GetSessionDetails(this).Id;
                var bookToCreate = this.mapper.Map<Book>(addRootBookDto);
                bookToCreate.CreationUserId = id;
                bookToCreate.UpdateUserId = id;
                bookToCreate.BookPath = uploadResponse.Path!;
                this.rootRepository.Add(bookToCreate);
                await this.rootRepository.SaveAll();
                return NoContent();
            }
            return BadRequest(new Response { Message = "", Status = Status.FAILURE });

        }

        [HttpPost("addSubject")]
        public async Task<IActionResult> AddSubject(AddSubjectDto subjectDto)
        {
            Guid id = Extensions.GetSessionDetails(this).Id;

            var subjectToCreate = this.mapper.Map<Subject>(subjectDto);
            subjectToCreate.CreationUserId = id;
            subjectToCreate.UpdateUserId = id;
            this.rootRepository.Add(subjectToCreate);
            await this.rootRepository.SaveAll();
            return NoContent();
        }
    }
}