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
        public required Guid StudentId { get; set; }
        public required Student Student { get; set; }
        public required Guid ClassId { get; set; }
        public required Class Class { get; set; }
        public required DateTime DateTime { get; set; }
    }
}