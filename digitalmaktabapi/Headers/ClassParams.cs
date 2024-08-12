using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Headers
{
    public class ClassParams : GeneralParams
    {
        public Guid? BranchId { get; set; }
        public Guid? CalendarYearId { get; set; }
        public ClassType? ClassType { get; set; }

        public Shift? Shift { get; set; }

        public Guid? TeacherId { get; set; }

    }
}