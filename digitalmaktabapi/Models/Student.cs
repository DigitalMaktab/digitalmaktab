using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    public class Student : Base
    {
        public required Guid SchoolId { get; set; }
        public required School School { get; set; }
        public required string FirstNameNative { get; set; }
        public required string LastNameNative { get; set; }
        public required string FatherNameNative { get; set; }
        public required string GrandFatherNameNative { get; set; }
        public required string FirstNameEnglish { get; set; }
        public required string LastNameEnglish { get; set; }
        public required string FatherNameEnglish { get; set; }
        public required string GrandFatherNameEnglish { get; set; }
        public required int AsasNumber { get; set; }
        public required DateOnly JoiningYear { get; set; }
        public required int JoiningAge { get; set; }
        public required Guid JoiningClassId { get; set; }
        public required Class JoiningClass { get; set; }
        public required Guid JoiningBranchId { get; set; }
        public required Branch JoiningBranch { get; set; }
        public required Guid CurrentClassId { get; set; }
        public required Class CurrentClass { get; set; }
        public required Guid CurrentBranchId { get; set; }
        public required Branch CurrentBranch { get; set; }
        public required Address PrimaryAddress { get; set; }
        public required Address SecondaryAddress { get; set; }
        public NationalId? NationalId { get; set; }
        public string? BrotherName { get; set; }
        public string? FUncleName { get; set; }
        public string? FCousinName { get; set; }
        public string? MUncleName { get; set; }
        public string? MCousinName { get; set; }
        public PhoneNumber? PhoneNumber { get; set; }

        public BloodGroup? BloodGroup { get; set; }
        public DisabilityType DisabilityType { get; set; }
        public IsOrphan IsOrphan { get; set; }
        public Language MotherTongue { get; set; }

        public required DateTime DateOfBirth { get; set; }
        public required Gender Gender { get; set; }
        public required string Email { get; set; }
        public required byte[] PasswordHash { get; set; }
        public required byte[] PasswordSalt { get; set; }
        public required UserRole UserRole { get; set; }
        public decimal? MonthlyFee { get; set; }
        public required ICollection<Attendance> Attendances { get; set; } = [];

        public required ICollection<Schedule> Schedules { get; set; } = [];
        public required ICollection<Fee> Fees { get; set; } = [];
    }
}