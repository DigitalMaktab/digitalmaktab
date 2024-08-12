using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Teacher")]
    public class Teacher : Base
    {
        public required Guid SchoolId { get; set; }
        public required School School { get; set; }

        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required DateOnly DateOfBirth { get; set; }
        public required Gender Gender { get; set; }
        public required Address PrimaryAddress { get; set; }
        public required PhoneNumber PhoneNumber { get; set; }
        public required string Email { get; set; }
        public required byte[] PasswordHash { get; set; }
        public required byte[] PasswordSalt { get; set; }
        public required ICollection<Schedule> Schedules { get; set; }
        public required Class Class { get; set; }
    }
}