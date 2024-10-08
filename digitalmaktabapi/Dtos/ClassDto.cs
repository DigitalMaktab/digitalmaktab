using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class ClassDto : BaseDto
    {
        public required Guid SchoolId { get; set; }
        public required SchoolDto School { get; set; }
        public required string ClassName { get; set; }
        public required Guid BranchId { get; set; }
        public required BranchDto Branch { get; set; }

        public required Guid CalendarYearId { get; set; }
        public required CalendarYearDto CalendarYear { get; set; }
        public required string ClassType { get; set; }
        public required string Shift { get; set; }
        public required Guid TeacherId { get; set; }
        public required TeacherDto Teacher { get; set; }
        public required ICollection<ClassSubjectForClassDto> ClassSubjects { get; set; } = [];
        public required ICollection<AttendanceDto> Attendances { get; set; } = [];
        public required ICollection<EnrollmentDto> Enrollments { get; set; } = [];
    }
}