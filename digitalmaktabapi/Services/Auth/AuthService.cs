using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using digitalmaktabapi.Data;
using digitalmaktabapi.Helpers;
using Microsoft.IdentityModel.Tokens;

namespace digitalmaktabapi.Services.Auth
{
    public class AuthService(
        ISchoolRepository schoolRepository,
        IStudentRepository studentRepository,
        TokenService tokenService
    )
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly TokenService tokenService = tokenService;


        public async Task<AuthUser> Authenticate(string email, string password)
        {

            Session session = new()
            {
                Email = email
            };
            var admin = await this.schoolRepository.Authenticate(email.ToLower(), password);
            if (admin != null)
            {
                session.Email = admin.Email;
                session.UserRole = admin.UserRole;
                session.Id = admin.Id;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session),
                    Entity = admin
                };
            }

            var student = await this.studentRepository.Authenticate(email.ToLower(), password);
            if (student != null)
            {
                session.Email = student.Email;
                session.UserRole = student.UserRole;
                session.Id = student.Id;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session),
                    Entity = student
                };
            }

            return null;
        }
    }
}