using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Class")]
    public class Class : Base
    {
        public required Guid SchoolId { get; set; }
        public required School School { get; set; }
        public required ClassName ClassName { get; set; }
        public required Guid BranchId { get; set; }
        public required Branch Branch { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYear CalendarYear { get; set; }
        public required ClassType ClassType { get; set; }
        public required Shift Shift { get; set; }
        public required Guid TeacherId { get; set; }
        public required Teacher Teacher { get; set; }
        public required ICollection<ClassSubject> ClassSubjects { get; set; } = [];
        public required ICollection<Attendance> Attendances { get; set; } = [];
    }
}