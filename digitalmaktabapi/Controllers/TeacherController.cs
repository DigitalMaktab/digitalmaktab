using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
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
        IMapper mapper,
        IStringLocalizer<TeacherController> localizer) : ControllerBase
    {
        private readonly ITeacherRepository repository = repository;
        private readonly IMapper mapper = mapper;
        private readonly IStringLocalizer<TeacherController> localizer = localizer;


        [HttpGet]
        public IActionResult GetTeacher()
        {
            return Ok();
        }
    }
}