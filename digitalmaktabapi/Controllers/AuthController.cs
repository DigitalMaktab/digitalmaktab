using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(IAuthService authService, IMapper mapper) : ControllerBase
    {
        private readonly IAuthService authService = authService;
        private readonly IMapper mapper = mapper;

        [HttpPost]
        public async Task<IActionResult> Authenticate(LoginDto loginDto)
        {
            AuthUser? authUser = await this.authService.Authenticate(loginDto.Email, loginDto.Password);
            if (authUser == null)
            {
                return Unauthorized();
            }

            switch (authUser.Entity)
            {
                case School school:
                    var adminToReturn = this.mapper.Map<SchoolDto>(school);
                    return Ok(new { school = adminToReturn, role = UserRole.ADMIN, authUser.Token });
                case Teacher teacher:
                    var teacherToReturn = this.mapper.Map<TeacherDto>(teacher);
                    return Ok(new { teacher = teacherToReturn, role = UserRole.TEACHER, authUser.Token });
                case Student student:
                    var studentToReurn = this.mapper.Map<StudentDto>(student);
                    return Ok(new { student = studentToReurn, role = UserRole.STUDENT, authUser.Token });
                case User user:
                    var userToReturn = this.mapper.Map<UserDto>(user);
                    return Ok(new { rootUser = userToReturn, role = UserRole.ROOT_USER, authUser.Token });
                default:
                    return Unauthorized();
            }

        }
    }
}