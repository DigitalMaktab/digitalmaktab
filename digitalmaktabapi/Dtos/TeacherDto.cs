using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class TeacherDto : BaseDto
    {
        public required Guid SchoolId { get; set; }
        public required SchoolDto School { get; set; }

        public required Guid ClassId { get; set; }
        public required ClassDto Class { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required DateOnly DateOfBirth { get; set; }
        public required Gender Gender { get; set; }
        public required AddressDto PrimaryAddress { get; set; }
        public required PhoneNumberDto PhoneNumber { get; set; }
        public required string Email { get; set; }
        public required ICollection<ScheduleDto> Schedules { get; set; }
    }
}