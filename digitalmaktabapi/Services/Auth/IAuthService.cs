using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.Auth
{
    public interface IAuthService
    {
        Task<AuthUser?> Authenticate(string email, string password);
    }
}