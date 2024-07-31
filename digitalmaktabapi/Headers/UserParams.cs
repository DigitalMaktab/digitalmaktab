using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Headers
{
    public class UserParams : GeneralParams
    {
        public Guid? ClassId { get; set; }
    }
}