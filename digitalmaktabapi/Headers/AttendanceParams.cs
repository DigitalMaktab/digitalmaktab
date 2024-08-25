using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class AttendanceParams
    {
        public Guid? ClassId { get; set; }
        public Guid? StudentId { get; set; }
        public required DateTime DateTime { get; set; }
    }
}