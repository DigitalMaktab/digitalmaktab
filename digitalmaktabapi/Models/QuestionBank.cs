using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("QuestionBank")]
    public class QuestionBank : Base
    {
        public required string Question { get; set; }
        public required string Option1 { get; set; }
        public required string Option2 { get; set; }
        public required string Option3 { get; set; }
        public required string Option4 { get; set; }
        public required string Answer { get; set; }
        public required Guid CourseId { get; set; }
        public required Course Course { get; set; }
    }
}