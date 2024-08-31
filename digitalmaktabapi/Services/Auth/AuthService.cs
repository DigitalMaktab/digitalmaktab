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
        ITeacherRepository teacherRepository,
        IRootRepository rootRepository,
        TokenService tokenService
    ) : IAuthService
    {
        private readonly ISchoolRepository schoolRepository = schoolRepository;
        private readonly IStudentRepository studentRepository = studentRepository;
        private readonly ITeacherRepository teacherRepository = teacherRepository;
        private readonly IRootRepository rootRepository = rootRepository;
        private readonly TokenService tokenService = tokenService;


        public async Task<AuthUser?> Authenticate(string email, string password)
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
                session.SchoolId = admin.Id;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session).Result,
                    Entity = admin
                };
            }

            var teacher = await this.teacherRepository.Authenticate(email.ToLower(), password);
            if (teacher != null)
            {
                session.Email = teacher.Email;
                session.UserRole = teacher.UserRole;
                session.Id = teacher.Id;
                session.SchoolId = teacher.SchoolId;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session).Result,
                    Entity = teacher
                };
            }

            var student = await this.studentRepository.Authenticate(email.ToLower(), password);
            if (student != null)
            {
                session.Email = student.Email;
                session.UserRole = student.UserRole;
                session.Id = student.Id;
                session.SchoolId = student.SchoolId;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session).Result,
                    Entity = student
                };
            }

            var user = await this.rootRepository.Authenticate(email.ToLower(), password);
            if (user != null)
            {
                session.Email = user.Email;
                session.UserRole = user.UserRole;
                session.Id = user.Id;
                session.SchoolId = Guid.Empty;
                return new AuthUser
                {
                    Token = this.tokenService.GenerateToken(session).Result,
                    Entity = user
                };
            }

            return null;
        }
    }
}