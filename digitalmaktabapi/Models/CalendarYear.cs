using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("CalendarYear")]
    public class CalendarYear : Base
    {
        public required DateOnly Year { get; set; }
        public required string NativeYear { get; set; }
    }
}