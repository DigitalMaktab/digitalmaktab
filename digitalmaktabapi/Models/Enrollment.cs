using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Enrollment")]
    public class Enrollment : Base
    {
        public required Guid StudentId { get; set; }
        public required Student Student { get; set; }
        public required Guid ClassId { get; set; }
        public required Class Class { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYear CalendarYear { get; set; }
    }
}