using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class BranchDto : BaseDto
    {
        public required string BranchName { get; set; }
    }
}