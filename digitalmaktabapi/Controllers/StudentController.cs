using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StudentController(IStudentRepository studentRepository) : ControllerBase
    {
        private readonly IStudentRepository studentRepository = studentRepository;


        [HttpGet]
        public async Task<IActionResult> GetStudent()
        {
            var student = await studentRepository.GetStudent(new Guid());
            return Ok(student);
        }
    }
}