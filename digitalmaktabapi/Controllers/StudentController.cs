using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "StudentPolicy")]
    public class StudentController(
        IStudentRepository studentRepository,
        IMapper mapper) : ControllerBase
    {
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly IMapper mapper = mapper;


        [HttpGet]
        public async Task<IActionResult> GetStudent()
        {
            Guid id = Extensions.GetSessionDetails(this).Id;
            var student = await studentRepository.GetStudent(id);
            var studentToReturn = this.mapper.Map<StudentDto>(student);
            return Ok(studentToReturn);
        }
    }
}