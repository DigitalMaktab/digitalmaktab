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
        Task<Teacher> GetStudent(Guid id);
        Task<PagedList<Teacher>> GetStudents(Guid schoolId, UserParams userParams);

        Task<int> GetStudentCount(Guid schoolId);
    }
}