using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class StudentDto : BaseDto
    {
        public required Guid SchoolId { get; set; }
        public required SchoolDto School { get; set; }
        public required string FirstNameNative { get; set; }
        public required string LastNameNative { get; set; }
        public required string FatherNameNative { get; set; }
        public required string GrandFatherNameNative { get; set; }
        public required string FirstNameEnglish { get; set; }
        public required string LastNameEnglish { get; set; }
        public required string FatherNameEnglish { get; set; }
        public required string GrandFatherNameEnglish { get; set; }
        public required int AsasNumber { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYearDto JoiningYear { get; set; }
        public required int JoiningAge { get; set; }
        public required Guid JoiningClassId { get; set; }
        public required ClassDto JoiningClass { get; set; }
        public required AddressDto PrimaryAddress { get; set; }
        public required AddressDto SecondaryAddress { get; set; }
        public NationalIdDto? NationalId { get; set; }
        public string? BrotherName { get; set; }
        public string? FUncleName { get; set; }
        public string? FCousinName { get; set; }
        public string? MUncleName { get; set; }
        public string? MCousinName { get; set; }
        public PhoneNumberDto? PhoneNumber { get; set; }

        public string? BloodGroup { get; set; }
        public required string DisabilityType { get; set; }
        public required string IsOrphan { get; set; }
        public required string MotherTongue { get; set; }

        public required DateTime DateOfBirth { get; set; }
        public required string Gender { get; set; }
        public required string Email { get; set; }
        public required UserRole UserRole { get; set; }
        public decimal? MonthlyFee { get; set; }
        public required ICollection<AttendanceDto> Attendances { get; set; } = [];

        public required ICollection<ScheduleDto> Schedules { get; set; } = [];
        public required ICollection<FeeDto> Fees { get; set; } = [];
    }
}