using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class GradeParams : GeneralParams
    {
        public Guid? ClassId { get; set; }
        public Guid? StudentId { get; set; }
    }
}