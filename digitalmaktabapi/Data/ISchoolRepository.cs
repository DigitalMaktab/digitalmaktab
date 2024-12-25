using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.domain.SchoolDashboard;
using digitalmaktabapi.Dtos.SchoolDashboard;
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

        Task<PagedList<Course>> GetCourses(Guid schoolId, ClassParams userParams);

        Task<bool> IsSudentEnrolled(Guid studentId, Guid calendarYearId, Guid classId);

        Task<PagedList<Enrollment>> GetEnrollments(Guid classId, Guid calendarYearId, UserParams userParams);
        Task<Enrollment> GetEnrollment(Guid id);

        Task<bool> IsScheduleExist(Guid calendarYearId, Guid courseId, Guid teacherId, DayOfWeek dayOfWeek, ScheduleTime scheduleTime);
        Task<bool> IsClassHasScheduleInDayAndTime(Guid calendarYearId, DayOfWeek dayOfWeek, ScheduleTime scheduleTime);
        Task<PagedList<Schedule>> GetSchedules(UserParams userParams);

        Task<int> TotalStudents(Guid id);
        Task<int> TotalTeachers(Guid id);

        Task<int> TotalBranches(Guid id);
        Task<int> TotalClasses(Guid id);

        Task<GenderChartDto> GetGenderChart(Guid id);
        Task<GenderChartDto> GetTeachersGenderChart(Guid id);
        Task<ICollection<ClassEnrollmentChartDomain>> GetClassEnrollmentChart(Guid id);
    }
}