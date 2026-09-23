using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
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
            return await this.context.Students.AnyAsync(a => a.Email.ToLower().Equals(prop.ToLower()));
        }

        public async Task<Student> GetStudent(Guid id)
        {
            var student = await this.context.Students.FirstOrDefaultAsync(a => a.Id == id);
            return student;
        }

        public async Task<Class> GetStudentClass(Guid id, Guid calendarYearId)
        {
            var classToReturn = await this.context.Classes
                .Include(a => a.Enrollments)
                .FirstOrDefaultAsync(a => a.Enrollments.Any(a => a.StudentId == id && a.CalendarYearId == calendarYearId));

            return classToReturn;
        }

        public async Task<int> GetStudentCount(Guid schoolId)
        {
            int count = await this.context.Students.Where(a => a.SchoolId == schoolId).CountAsync();
            return count;
        }

        public async Task<PagedList<Student>> GetStudents(Guid schoolId, UserParams userParams)
        {
            var students = this.context.Students
            .Include(a => a.Enrollments)
            .ThenInclude(a => a.Class)
            .ThenInclude(a => a.Branch)
            .Where(a => a.SchoolId == schoolId)
            .AsQueryable();

            if (userParams.ClassId.HasValue)
            {
                students = students.Where(a => a.Enrollments.Any(a => a.ClassId == userParams.ClassId));
            }

            if (userParams.CalendarYearId.HasValue)
            {
                students = students.Where(a => a.Enrollments.Any(a => a.CalendarYearId == userParams.CalendarYearId));
            }

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

        public async Task<bool> UpdatePassword(Student student, string password)
        {
            Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            student.PasswordHash = passwordHash;
            student.PasswordSalt = passwordSalt;
            return await this.context.SaveChangesAsync() > 0;
        }
    }
}