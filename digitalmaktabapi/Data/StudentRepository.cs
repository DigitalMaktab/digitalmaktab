using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class StudentRepository(DataContext context) : BaseRepository(context), IStudentRepository
    {
        private readonly DataContext context = context;

        public async Task<Student> Authenticate(string email, string password)
        {
            var student = await this.context.Students.FirstOrDefaultAsync(a => a.Email == email);
            if (student == null) return null;

            if (!Helpers.Extensions.VerifyPasswordHash(password, student.PasswordHash, student.PasswordSalt))
            {
                return null;
            }
            return student;
        }

        public async Task<bool> Exists(string prop)
        {
            return await this.context.Students.AnyAsync(a => a.Email.Equals(prop));
        }

        public async Task<Student> GetStudent(Guid id)
        {
            var student = await this.context.Students.FirstOrDefaultAsync(a => a.Id == id);
            return student;
        }

        public async Task<int> GetStudentCount(Guid schoolId)
        {
            int count = await this.context.Students.Where(a => a.SchoolId == schoolId).CountAsync();
            return count;
        }

        public async Task<PagedList<Student>> GetStudents(Guid schoolId, UserParams userParams)
        {
            var students = this.context.Students.Where(a => a.SchoolId == schoolId).AsQueryable();

            return await PagedList<Student>.CreateAsync(students, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<Student> Register(Student student, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            student.PasswordHash = passwordHash;
            student.PasswordSalt = passwordSalt;

            await this.context.Students.AddAsync(student);
            await this.context.SaveChangesAsync();
            return student;
        }

        public Task<bool> UpdatePassword(Student entity, string password)
        {
            throw new NotImplementedException();
        }
    }
}