using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Data
{
    public interface ISchoolRepository : IBaseRepository, IAuthRepository<School>
    {
        Task<School> GetSchool(Guid id);
        Task<PagedList<School>> GetSchools(UserParams userParams);
    }
}