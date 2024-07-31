using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "RootUserPolicy")]
    public class RootController(
        ISchoolRepository schoolRepository,
        IMapper mapper) : ControllerBase
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IMapper mapper = mapper;

        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools([FromQuery] UserParams userParams)
        {
            var schools = await this.schoolRepository.GetSchools(userParams);
            var schoolsToReturn = this.mapper.Map<ICollection<SchoolDto>>(schools);
            return Ok(schoolsToReturn);
        }
    }
}