using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
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
    [Authorize(Policy = "AdminPolicy")]
    public class SchoolController(
        ISchoolRepository schoolRepository,
        IMapper mapper,
        IStringLocalizer<SchoolController> localizer
        ) : ControllerBase
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IMapper mapper = mapper;
        private readonly IStringLocalizer<SchoolController> localizer = localizer;

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

        // [HttpPost("registerStudent")]
        // public async Task<IActionResult> RegisterStudent(AddStudentDto studentDto)
        // {
        //     Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;

        // }

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