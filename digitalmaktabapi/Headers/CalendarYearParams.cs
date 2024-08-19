using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class CalendarYearParams : GeneralParams
    {
        public required Guid CalendarYearId { get; set; }
    }
}