using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class UserParams : GeneralParams
    {
        public Guid? ClassId { get; set; }
        public Guid? CalendarYearId { get; set; }
        public Guid? TeacherId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime? DateTime { get; set; }
        public Guid? StudentId { get; set; }
        public string? Email { get; set; }
        public Guid? CourseId { get; set; }
    }
}