using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Course")]
    public class Course : Base
    {
        public required Guid ClassId { get; set; }
        public required Class Class { get; set; }
        public required Guid SubjectId { get; set; }
        public required Subject Subject { get; set; }
    }
}