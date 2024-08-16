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
                    return Ok(new { admin = adminToReturn, authUser.Token });
                default:
                    return Unauthorized();
            }

        }
    }
}