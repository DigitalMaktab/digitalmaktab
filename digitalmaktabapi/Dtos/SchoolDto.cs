using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class SchoolDto : BaseDto
    {
        public required string SchoolName { get; set; }
        public required AddressDto Address { get; set; }
        public required PhoneNumberDto PhoneNumber { get; set; }
        public required string Email { get; set; }
        public required string Logo { get; set; }
        public required int Code { get; set; }
        public required SchoolType SchoolType { get; set; }
        public required string SchoolTypeValue { get; set; }
        public required UserRole UserRole { get; set; }
        public ICollection<StudentDto> Students { get; set; } = [];
    }
}