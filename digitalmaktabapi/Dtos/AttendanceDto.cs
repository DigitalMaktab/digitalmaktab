using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class AttendanceDto : BaseDto
    {
        public required Guid EnrollmentId { get; set; }
        public required EnrollmentDto Enrollment { get; set; }
        public required DateTime DateTime { get; set; }
    }
}