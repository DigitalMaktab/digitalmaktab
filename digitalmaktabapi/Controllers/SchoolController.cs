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

        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools([FromQuery] UserParams userParams)
        {
            var schoolsFromRepo = await this.schoolRepository.GetSchools(userParams);
            var schoolsToReturn = this.mapper.Map<ICollection<SchoolDto>>(schoolsFromRepo);
            Response.AddPagintaion(schoolsFromRepo.CurrentPage, schoolsFromRepo.PageSize, schoolsFromRepo.TotalCount, schoolsFromRepo.TotalPages);
            return Ok(schoolsToReturn);

        }
        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult> AddSchool(SchoolForAddDto schoolForAddDto)
        {
            schoolForAddDto.Email = schoolForAddDto.Email.ToLower();
            if (await this.schoolRepository.Exists(schoolForAddDto.Email))
            {
                return BadRequest(this.localizer["SchoolExists"].Value);
            }

            var schoolToCreate = this.mapper.Map<School>(schoolForAddDto);
            await this.schoolRepository.Register(schoolToCreate, schoolForAddDto.Password);
            return StatusCode(201);
        }
    }
}