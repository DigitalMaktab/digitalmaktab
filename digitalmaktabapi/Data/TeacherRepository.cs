using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class TeacherRepository(DataContext context) : BaseRepository(context), ITeacherRepository
    {
        private readonly DataContext context = context;

        public async Task<Teacher> Authenticate(string email, string password)
        {
            var teacher = await this.context.Teachers.FirstOrDefaultAsync(a => a.Email == email);
            if (teacher == null) return null;

            if (!Helpers.Extensions.VerifyPasswordHash(password, teacher.PasswordHash, teacher.PasswordSalt))
            {
                return null;
            }
            return teacher;
        }

        public async Task<bool> Exists(string prop)
        {
            return await this.context.Teachers.AnyAsync(a => a.Email.Equals(prop));
        }

        public async Task<Teacher> GetStudent(Guid id)
        {
            var teacher = await this.context.Teachers.FirstOrDefaultAsync(a => a.Id == id);
            return teacher;
        }

        public async Task<int> GetStudentCount(Guid schoolId)
        {
            int count = await this.context.Teachers.Where(a => a.SchoolId == schoolId).CountAsync();
            return count;
        }

        public async Task<PagedList<Teacher>> GetStudents(Guid schoolId, UserParams userParams)
        {
            var teachers = this.context.Teachers.Where(a => a.SchoolId == schoolId).AsQueryable();

            return await PagedList<Teacher>.CreateAsync(teachers, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<Teacher> Register(Teacher teacher, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            teacher.PasswordHash = passwordHash;
            teacher.PasswordSalt = passwordSalt;

            await this.context.Teachers.AddAsync(teacher);
            await this.context.SaveChangesAsync();
            return teacher;
        }

        public Task<bool> UpdatePassword(Teacher entity, string password)
        {
            throw new NotImplementedException();
        }
    }
}