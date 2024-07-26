using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("user")]
    public class User : Base
    {
        public required UserRole UserRole { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required byte[] PasswordHash { get; set; }
        public required byte[] PasswordSalt { get; set; }
        public required string Email { get; set; }
    }
}