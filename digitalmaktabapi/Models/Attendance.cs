using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Attendance")]
    public class Attendance : Base
    {
        public required Guid EnrollmentId { get; set; }
        public required Enrollment Enrollment { get; set; }
        public required DateTime DateTime { get; set; }
    }
}