using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Fee")]
    public class Fee : Base
    {
        public required Guid StudentId { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYear CalendarYear { get; set; }
        public required Month Month { get; set; }
        public required decimal Amount { get; set; }
    }
}