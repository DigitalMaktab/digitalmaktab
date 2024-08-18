using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using DayOfWeek = digitalmaktabapi.Models.DayOfWeek;

namespace digitalmaktabapi.Data
{
    public interface ISchoolRepository : IBaseRepository, IAuthRepository<School>
    {
        Task<School> GetSchool(Guid id);
        Task<PagedList<School>> GetSchools(UserParams userParams);
        Task<PagedList<Branch>> GetBranches(Guid schoolId, UserParams userParams);
        Task<Branch> GetBranch(Guid branchId);

        Task<PagedList<Class>> GetClasses(Guid schoolId, ClassParams userParams);
        Task<Class> GetClass(Guid classId);

        Task<bool> IsSudentEnrolled(Guid studentId, Guid calendarYearId, Guid classId);

        Task<PagedList<Enrollment>> GetEnrollments(Guid classId, Guid calendarYearId, UserParams userParams);
        Task<Enrollment> GetEnrollment(Guid id);

        Task<bool> IsScheduleExist(Guid calendarYearId, Guid classSubjectId, Guid teacherId, DayOfWeek dayOfWeek, ScheduleTime scheduleTime);
        Task<bool> IsClassHasScheduleInDayAndTime(Guid calendarYearId, DayOfWeek dayOfWeek, ScheduleTime scheduleTime);
        Task<PagedList<Schedule>> GetSchedules(Guid calendarYearId, Guid classId, UserParams userParams);
    }
}