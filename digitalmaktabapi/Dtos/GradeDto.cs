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
        public required Guid ClassSubjectId { get; set; }
        public required ClassSubjectDto ClassSubject { get; set; }
        public required ExamType ExamType { get; set; }
        public required decimal Score { get; set; }
    }
}