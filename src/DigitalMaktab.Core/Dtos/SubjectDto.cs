using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class SubjectDto : BaseDto
    {
        public required string SubjectName { get; set; }
        public required Guid BookId { get; set; }
        public required BookDto Book { get; set; }
        public required ICollection<CourseDto> Courses { get; set; } = [];
    }
}