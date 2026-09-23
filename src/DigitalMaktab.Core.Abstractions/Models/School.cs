using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("School")]
    public class School : Base
    {
        public required string SchoolName { get; set; }
        public required Address Address { get; set; }
        public required PhoneNumber PhoneNumber { get; set; }
        public required string Email { get; set; }
        public required byte[] PasswordHash { get; set; }
        public required byte[] PasswordSalt { get; set; }
        public string? Logo { get; set; }
        public required int Code { get; set; }
        public required SchoolType SchoolType { get; set; }
        public required UserRole UserRole { get; set; }

        // Every school belongs to a country. Country drives calendar, language, currency,
        // and country-module resolution (Phase A step 4 of docs/globalization.md).
        public required Guid CountryId { get; set; }
        public required Country Country { get; set; }

        public ICollection<Student> Students { get; set; } = [];
        public ICollection<Branch> Branches { get; set; } = [];
    }
}