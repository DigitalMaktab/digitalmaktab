using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Data
{
    public interface IAuthRepository<T> where T : class
    {
        Task<T> Authenticate(string email, string password);
        Task<T> Register(T entity, string password);
        Task<bool> Exists(string prop);
    }
}