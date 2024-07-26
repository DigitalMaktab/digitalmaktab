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

        public Task<bool> Exists(string prop)
        {
            throw new NotImplementedException();
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

        public Task<Student> Register(Student entity, string password)
        {
            throw new NotImplementedException();
        }
    }
}