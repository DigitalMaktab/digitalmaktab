using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class CourseDto : BaseDto
    {
        public required Guid ClassId { get; set; }
        public required ClassDto Class { get; set; }
        public required Guid SubjectId { get; set; }
        public required SubjectDto Subject { get; set; }
    }
}