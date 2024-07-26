using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Data
{
    public interface IStudentRepository : IBaseRepository, IAuthRepository<Student>
    {
        Task<Student> GetStudent(Guid id);
        Task<PagedList<Student>> GetStudents(Guid schoolId, UserParams userParams);

        Task<int> GetStudentCount(Guid schoolId);
    }
}