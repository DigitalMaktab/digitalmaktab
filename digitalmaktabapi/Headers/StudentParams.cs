using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class StudentParams : GeneralParams
    {
        public required Guid ClassId { get; set; }
    }
}