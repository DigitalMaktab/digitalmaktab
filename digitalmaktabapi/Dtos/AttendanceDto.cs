using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class AttendanceDto : BaseDto
    {
        public required Guid StudentId { get; set; }
        public required StudentDto Student { get; set; }
        public required Guid ClassId { get; set; }
        public required ClassDto Class { get; set; }
        public required DateTime DateTime { get; set; }
    }
}