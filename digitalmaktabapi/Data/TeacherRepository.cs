using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using DotCommon.Extensions;
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
            return await this.context.Teachers.AnyAsync(a => a.Email.ToLower().Equals(prop.ToLower()));
        }

        public async Task<Teacher> GetTeacher(Guid id)
        {
            var teacher = await this.context.Teachers.FirstOrDefaultAsync(a => a.Id == id);
            return teacher;
        }

        public async Task<int> GetTeachersCount(Guid schoolId)
        {
            int count = await this.context.Teachers.Where(a => a.SchoolId == schoolId).CountAsync();
            return count;
        }

        public async Task<PagedList<Teacher>> GetTeachers(Guid schoolId, UserParams userParams)
        {
            var teachers = this.context.Teachers
                .Include(a => a.Classes)
                .ThenInclude(a => a.Branch)
                .Include(a => a.PhoneNumber)
                .ThenInclude(a => a.Country)
                .Include(a => a.PrimaryAddress)
                .Include(a => a.Schedules)
                .Where(a => a.SchoolId == schoolId).AsQueryable();

            if (userParams.TeacherId.HasValue)
            {
                teachers = teachers.Where(a => a.Id == userParams.TeacherId);
            }

            if (!userParams.SearchTerm.IsEmpty() && userParams.SearchTerm != null)
            {
                teachers = teachers.Where(
                                a => a.FirstName.Contains(userParams.SearchTerm, StringComparison.CurrentCultureIgnoreCase) ||
                                a.LastName.Contains(userParams.SearchTerm, StringComparison.CurrentCultureIgnoreCase)
                            );
            }

            if (!userParams.Email.IsEmpty() && userParams.Email != null)
            {
                teachers = teachers.Where(a => a.Email.Contains(userParams.Email, StringComparison.CurrentCultureIgnoreCase));
            }

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

        public async Task<bool> UpdatePassword(Teacher teacher, string password)
        {
            Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            teacher.PasswordHash = passwordHash;
            teacher.PasswordSalt = passwordSalt;
            return await this.context.SaveChangesAsync() > 0;
        }

        public async Task<Attendance> GetAttendance(Guid enrollmentId, DateTime dateTime)
        {
            return await this.context.Attendances.FirstOrDefaultAsync(a => a.EnrollmentId == enrollmentId && a.DateTime.Date == dateTime.Date);
        }

        public async Task<PagedList<Attendance>> GetAttendances(UserParams userParams)
        {
            // Check if none of the parameters are provided
            if (!userParams.ClassId.HasValue && !userParams.DateTime.HasValue && !userParams.StudentId.HasValue)
            {
                // Return an empty PagedList if no parameters are provided
                return new PagedList<Attendance>([], 0, userParams.PageNumber, userParams.PageSize);
            }

            var attendances = this.context.Attendances
                .Include(a => a.Enrollment).ThenInclude(a => a.Student)
                .Where(a => a.Enrollment.CalendarYearId == userParams.CalendarYearId)
                .AsQueryable();

            if (userParams.ClassId.HasValue)
            {
                attendances = attendances.Where(a => a.Enrollment.ClassId == userParams.ClassId);
            }

            if (userParams.DateTime != null && userParams.DateTime.HasValue)
            {
                attendances = attendances.Where(a => a.DateTime.Date == userParams.DateTime.Value.Date);
            }

            if (userParams.StudentId.HasValue)
            {
                attendances = attendances.Where(a => a.Enrollment.StudentId == userParams.StudentId);
            }

            return await PagedList<Attendance>.CreateAsync(attendances, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<Grade> GetGrade(Guid enrollmentId, Guid courseId, ExamType examType)
        {
            return await this.context.Grades.FirstOrDefaultAsync(
                a => a.EnrollmentId == enrollmentId &&
                a.CourseId == courseId &&
                a.ExamType == examType
            );
        }

        public async Task<PagedList<Grade>> GetGrades(UserParams userParams)
        {
            // Check if none of the parameters are provided
            if (!userParams.ClassId.HasValue && !userParams.StudentId.HasValue)
            {
                // Return an empty PagedList if no parameters are provided
                return new PagedList<Grade>([], 0, userParams.PageNumber, userParams.PageSize);
            }

            var grades = this.context.Grades
                .Include(a => a.Enrollment).ThenInclude(a => a.Student)
                .Include(a => a.Course).ThenInclude(a => a.Class)
                .Where(a => a.Enrollment.CalendarYearId == userParams.CalendarYearId)
                .AsQueryable();

            if (userParams.ClassId.HasValue)
            {
                grades = grades.Where(a => a.Enrollment.ClassId == userParams.ClassId);
            }

            if (userParams.StudentId.HasValue)
            {
                grades = grades.Where(a => a.Enrollment.StudentId == userParams.StudentId);
            }

            return await PagedList<Grade>.CreateAsync(grades, userParams.PageNumber, userParams.PageSize);

        }
    }
}