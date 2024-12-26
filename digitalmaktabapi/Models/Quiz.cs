using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Quiz")]
    public class Quiz : Base
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required Guid CourseId { get; set; }
        public required Course Course { get; set; }
        public required DateTime DueDate { get; set; }
        public required double TotalQuestions { get; set; }
    }
}