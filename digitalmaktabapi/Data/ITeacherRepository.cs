using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Data
{
    public interface ITeacherRepository : IBaseRepository, IAuthRepository<Teacher>
    {
        Task<Teacher> GetTeacher(Guid id);
        Task<PagedList<Teacher>> GetTeachers(Guid schoolId, UserParams userParams);

        Task<int> GetTeachersCount(Guid schoolId);
        Task<bool> IsAttendanceExists(Guid enrollmentId, DateTime dateTime);

        Task<PagedList<Attendance>> GetAttendances(UserParams userParams);
    }
}