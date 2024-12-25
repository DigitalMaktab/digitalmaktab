using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class GradeDto : BaseDto
    {
        public required Guid EnrollmentId { get; set; }
        public required EnrollmentDto Enrollment { get; set; }
        public required Guid CourseId { get; set; }
        public required CourseDto Course { get; set; }
        public required string ExamTypeValue { get; set; }
        public required ExamType ExamType { get; set; }
        public required decimal Score { get; set; }
    }
}