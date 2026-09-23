using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class CalendarYearDto : BaseDto
    {
        public required DateOnly Year { get; set; }
        public required string NativeYear { get; set; }
    }
}