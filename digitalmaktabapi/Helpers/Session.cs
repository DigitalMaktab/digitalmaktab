using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers
{
    public class Session
    {
        public Guid Id { get; set; }
        public required string Email { get; set; }
        public UserRole UserRole { get; set; }
        public Guid AdminUserId { get; set; }
    }
}