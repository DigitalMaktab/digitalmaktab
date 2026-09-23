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
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "RootUserPolicy")]
    public class RootController(
        IRootRepository rootRepository,
        ISchoolRepository schoolRepository,
        IStringLocalizer<RootController> localizer,
        IStringLocalizer<MainController> mainLocalizer,
        IMapper mapper) : BaseController(mapper, localizer)
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IRootRepository rootRepository = rootRepository;

        private readonly IStringLocalizer<MainController> mainLocalizer = mainLocalizer;


        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools([FromQuery] UserParams userParams)
        {
            var schools = await this.schoolRepository.GetSchools(userParams);
            var schoolsToReturn = this.mapper!.Map<ICollection<SchoolDto>>(schools);
            return Ok(schoolsToReturn);
        }

        [HttpPost("addCalendarYear")]
        public async Task<IActionResult> AddCalendaryYear(AddCalendarYearDto calendarYearDto)
        {

            var calendarYearToCreate = this.mapper!.Map<CalendarYear>(calendarYearDto);
            calendarYearToCreate.CreationUserId = this.Id;
            calendarYearToCreate.UpdateUserId = this.Id;
            this.rootRepository.Add(calendarYearToCreate);
            await this.rootRepository.SaveAll();
            return NoContent();
        }

        [HttpGet("calendarYears")]
        public async Task<IActionResult> GetCalendarYears([FromQuery] UserParams userParams)
        {
            var calendarYears = await this.rootRepository.GetCalendarYears(userParams);
            var calendarYearsToReturn = this.mapper!.Map<ICollection<CalendarYearDto>>(calendarYears);
            return Ok(calendarYearsToReturn);
        }

        [HttpGet("activeCalendarYear")]
        public async Task<IActionResult> GetActiveCalendarYear()
        {
            var calendarYear = await this.rootRepository.GetActiveCalendarYear();
            var calendarYearToReturn = this.mapper!.Map<CalendarYearDto>(calendarYear);
            return Ok(calendarYearToReturn);
        }

        /// <summary>
        /// Add a book
        /// </summary>
        /// <body name="addRootBookDto">Get the book dto in body of the request</body>
        /// <returns>Returns a no content if it was added otherwise a bad request</returns>
        [HttpPost("addBook")]
        public async Task<IActionResult> AddBook([FromForm] AddRootBookDto addRootBookDto)
        {
            UploadResponse uploadResponse = await UploadService.Upload(addRootBookDto.File, "books");
            if (uploadResponse.Status == Status.SUCCESS)
            {
                var bookToCreate = this.mapper!.Map<Book>(addRootBookDto);
                bookToCreate.CreationUserId = this.Id;
                bookToCreate.UpdateUserId = this.Id;
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
            var subjectToCreate = this.mapper!.Map<Subject>(subjectDto);
            var book = await this.rootRepository.GetBook(subjectDto.BookId) ?? throw new Exception("Book not found");
            subjectToCreate.CreationUserId = this.Id;
            subjectToCreate.UpdateUserId = this.Id;
            subjectToCreate.Book = book;
            this.rootRepository.Add(subjectToCreate);
            await this.rootRepository.SaveAll();
            return NoContent();
        }

        [HttpDelete("deleteSubject/{id}")]
        public async Task<IActionResult> DeleteTeacher(Guid id)
        {
            var subject = await this.rootRepository.GetSubject(id);
            if (subject != null)
            {
                this.rootRepository.Delete(subject);
                await this.rootRepository.SaveAll();
            }
            return NoContent();
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult> RegisterRootUser(AddRootUserDto rootUserDto)
        {
            rootUserDto.Email = rootUserDto.Email.ToLower();
            if (await this.rootRepository.Exists(rootUserDto.Email))
            {
                return BadRequest(this.localizer!["UserExists"].Value);
            }
            var userToCreate = this.mapper!.Map<User>(rootUserDto);
            await this.rootRepository.Register(userToCreate, rootUserDto.Password);
            return StatusCode(201);
        }


        [HttpPut("updatePassword")]
        public async Task<IActionResult> UpdatePassword(UpdatePasswordDto updatePasswordDto)
        {
            User user = await this.rootRepository.Authenticate(this.Email, updatePasswordDto.CurrentPassword);

            if (user == null)
            {
                return BadRequest(mainLocalizer["InvalidCurrentPassword"].Value);
            }
            await this.rootRepository.UpdatePassword(user, updatePasswordDto.NewPassword);
            return NoContent();
        }
    }
}