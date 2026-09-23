using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class FeeDto : BaseDto
    {
        public required Guid StudentId { get; set; }
        public required StudentDto Student { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required CalendarYearDto CalendarYear { get; set; }
        public required string Month { get; set; }
        public required decimal Amount { get; set; }
    }
}