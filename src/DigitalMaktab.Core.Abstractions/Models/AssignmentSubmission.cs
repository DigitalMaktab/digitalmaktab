using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("AssignmentSubmission")]
    public class AssignmentSubmission : Base
    {
        public required Guid AssignmentId { get; set; }
        public required Assignment Assignment { get; set; }
        public required Guid StudentId { get; set; }
        public required Student Student { get; set; }
        public required string FilePath { get; set; }
        public required DateTime SubmissionDate { get; set; }
        public required string Grade { get; set; }
    }
}