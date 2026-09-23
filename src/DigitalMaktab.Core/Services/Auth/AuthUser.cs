using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.Auth
{
    public class AuthUser
    {
        public required object Entity { get; set; }
        public required string Token { get; set; }
    }
}