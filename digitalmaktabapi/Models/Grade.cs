using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Grade")]
    public class Grade : Base
    {
        public required Guid EnrollmentId { get; set; }
        public required Enrollment Enrollment { get; set; }
        public required Guid ClassSubjectId { get; set; }
        public required ClassSubject ClassSubject { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYear CalendarYear { get; set; }
        public required ExamType ExamType { get; set; }
        public required decimal Score { get; set; }
    }
}