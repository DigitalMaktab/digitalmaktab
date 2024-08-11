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
        IMapper mapper,
        IStringLocalizer<SchoolController> localizer,
        IMailService mailService
        ) : ControllerBase
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
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
                EmailSubject = this.localizer["StudentAccountAccessSubject"],
                EmailBody = this.localizer["StudentAccountDetails", studentName, studentDto.Email, studentPassword]
            };

            if (await this.mailService.SendMail(mailData))
            {
                var studentToCreate = this.mapper.Map<Student>(studentDto);
                studentToCreate.SchoolId = schoolId;
                await this.studentRepository.Register(studentToCreate, studentPassword);
            }

            return StatusCode(201);
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