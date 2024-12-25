using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Schedule")]
    public class Schedule : Base
    {
        public required Guid CourseId { get; set; }
        public required Course Course { get; set; }
        public required Guid TeacherId { get; set; }
        public required Teacher Teacher { get; set; }
        public required DayOfWeek DayOfWeek { get; set; }
        public required ScheduleTime ScheduleTime { get; set; }
    }
}