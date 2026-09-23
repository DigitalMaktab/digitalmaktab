using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class BookDto : BaseDto
    {
        public Guid? SchoolId { get; set; }
        public SchoolDto? School { get; set; }
        public required string BookTitle { get; set; }
        public required string BookPath { get; set; }

        public required Guid SubjectId { get; set; }
        public required SubjectDto Subject { get; set; }
    }
}