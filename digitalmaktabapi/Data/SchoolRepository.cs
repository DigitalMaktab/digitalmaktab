using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class SchoolRepository(DataContext context, IRootRepository rootRepository) : BaseRepository(context), ISchoolRepository
    {
        private readonly DataContext context = context;
        private readonly IRootRepository rootRepository = rootRepository;

        public async Task<School> Authenticate(string email, string password)
        {
            var school = await this.context.Schools.FirstOrDefaultAsync(a => a.Email == email);
            if (school == null) return null;

            if (!Helpers.Extensions.VerifyPasswordHash(password, school.PasswordHash, school.PasswordSalt))
            {
                return null;
            }
            return school;
        }

        public async Task<bool> Exists(string prop)
        {
            return await this.context.Schools.AnyAsync(a => a.Email.ToLower().Equals(prop.ToLower()));
        }

        public async Task<Branch> GetBranch(Guid branchId)
        {
            var entity = await this.context.Branches.FirstOrDefaultAsync(a => a.Id == branchId);
            return entity;
        }

        public async Task<PagedList<Branch>> GetBranches(Guid schoolId, UserParams userParams)
        {
            var branches = this.context.Branches.Where(a => a.SchoolId == schoolId).AsQueryable();
            return await PagedList<Branch>.CreateAsync(branches, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<Class> GetClass(Guid classId)
        {
            var entity = await this.context.Classes
            .Include(a => a.ClassSubjects)
            .ThenInclude(a => a.Subject)
            .ThenInclude(a => a.Book)
            .FirstOrDefaultAsync(a => a.Id == classId);
            return entity;
        }

        public async Task<PagedList<Class>> GetClasses(Guid schoolId, ClassParams classParams)
        {
            var entities = this.context.Classes.Where(a => a.SchoolId == schoolId).AsQueryable();
            if (classParams.BranchId.HasValue)
            {
                entities = entities.Where(a => a.BranchId == classParams.BranchId);
            }
            if (classParams.CalendarYearId.HasValue)
            {
                entities = entities.Where(a => a.CalendarYearId == classParams.CalendarYearId);
            }
            if (classParams.ClassType.HasValue)
            {
                entities = entities.Where(a => a.ClassType == classParams.ClassType);
            }
            if (classParams.Shift.HasValue)
            {
                entities = entities.Where(a => a.Shift == classParams.Shift);
            }
            if (classParams.TeacherId.HasValue)
            {
                entities = entities.Where(a => a.TeacherId == classParams.TeacherId);
            }
            return await PagedList<Class>.CreateAsync(entities, classParams.PageNumber, classParams.PageSize);
        }

        public async Task<Enrollment> GetEnrollment(Guid id)
        {
            var entity = await this.context.Enrollments
            .Include(a => a.Student)
            .Include(a => a.Class)
            .Include(a => a.CalendarYear)
            .FirstOrDefaultAsync(a => a.Id == id);
            return entity;
        }

        public async Task<PagedList<Enrollment>> GetEnrollments(Guid classId, Guid calendarYearId, UserParams userParams)
        {
            var enrollments = this.context.Enrollments
            .Include(a => a.Student)
            .Include(a => a.CalendarYear)
            .Where(a => a.ClassId == classId && a.CalendarYearId == calendarYearId).AsQueryable();
            return await PagedList<Enrollment>.CreateAsync(enrollments, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<PagedList<Schedule>> GetSchedules(UserParams userParams)
        {
            var schedules = this.context.Schedules
            .Include(a => a.ClassSubject)
            .ThenInclude(a => a.Class)
            .AsQueryable();

            if (userParams.ClassId.HasValue)
            {
                schedules = schedules.Where(a => a.ClassSubject.ClassId == userParams.ClassId);
            }
            if (userParams.CalendarYearId.HasValue)
            {
                schedules = schedules.Where(a => a.ClassSubject.Class.CalendarYearId == userParams.CalendarYearId);
            }

            if (userParams.TeacherId.HasValue)
            {
                schedules = schedules.Where(a => a.TeacherId == userParams.TeacherId);
            }

            return await PagedList<Schedule>.CreateAsync(schedules, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<School> GetSchool(Guid id)
        {
            var school = await this.context.Schools.FirstOrDefaultAsync(a => a.Id == id);
            return school;
        }

        public async Task<PagedList<School>> GetSchools(UserParams userParams)
        {
            var schools = this.context.Schools.AsQueryable();
            return await PagedList<School>.CreateAsync(schools, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<bool> IsClassHasScheduleInDayAndTime(Guid calendarYearId, Models.DayOfWeek dayOfWeek, ScheduleTime scheduleTime)
        {
            return await this.context.Schedules
                .Include(a => a.ClassSubject)
                .ThenInclude(a => a.Class)
                .AnyAsync(
                    a => a.DayOfWeek == dayOfWeek &&
                    a.ScheduleTime == scheduleTime &&
                    a.ClassSubject.Class.CalendarYearId == calendarYearId
                );
        }

        public async Task<bool> IsScheduleExist(Guid calendarYearId, Guid classSubjectId, Guid teacherId, Models.DayOfWeek dayOfWeek, ScheduleTime scheduleTime)
        {
            return await this.context.Schedules
                .Include(a => a.ClassSubject)
                .ThenInclude(a => a.Class)
                .AnyAsync(
                    a => a.ClassSubjectId == classSubjectId &&
                    a.TeacherId == teacherId &&
                    a.DayOfWeek == dayOfWeek &&
                    a.ScheduleTime == scheduleTime &&
                    a.ClassSubject.Class.CalendarYearId == calendarYearId
            );
        }

        public async Task<bool> IsSudentEnrolled(Guid studentId, Guid calendarYearId, Guid classId)
        {
            return await this.context.Enrollments.AnyAsync(a => a.StudentId == studentId && a.CalendarYearId == calendarYearId && a.ClassId == classId);
        }

        public async Task<School> Register(School school, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            school.PasswordHash = passwordHash;
            school.PasswordSalt = passwordSalt;

            District district = await this.rootRepository.GetDistrict(school.Address.DistrictId ?? Guid.Empty);
            school.Address.District = district;

            await this.context.Schools.AddAsync(school);
            await this.context.SaveChangesAsync();
            return school;
        }

        public async Task<bool> UpdatePassword(School school, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            school.PasswordHash = passwordHash;
            school.PasswordSalt = passwordSalt;

            int changes = await this.context.SaveChangesAsync();
            return changes > 0;
        }
    }
}