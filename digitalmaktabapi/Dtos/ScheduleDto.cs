using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class ScheduleDto : BaseDto
    {
        public required Guid ClassSubjectId { get; set; }
        public required ClassSubjectDto ClassSubject { get; set; }
        public required Guid TeacherId { get; set; }
        public required TeacherDto Teacher { get; set; }
        public required string DayOfWeekValue { get; set; }
        public required Models.DayOfWeek DayOfWeek { get; set; }
        public required ScheduleTime ScheduleTime { get; set; }
    }
}