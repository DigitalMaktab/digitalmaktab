using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Subject")]
    public class Subject : Base
    {
        public required string SubjectName { get; set; }
        public required Guid BookId { get; set; }
        public required Book Book { get; set; }
        public required ICollection<ClassSubject> ClassSubjects { get; set; } = [];
    }
}