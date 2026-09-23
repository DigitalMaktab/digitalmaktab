using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Assignment")]
    public class Assignment : Base
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public string? FilePath { get; set; }
        public required Guid CourseId { get; set; }
        public required Course Course { get; set; }
        public required DateTime DueDate { get; set; }
    }
}