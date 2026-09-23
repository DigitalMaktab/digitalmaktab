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
        public required Guid CourseId { get; set; }
        public required Course Course { get; set; }
        public required ExamType ExamType { get; set; }
        public required decimal Score { get; set; }
    }
}