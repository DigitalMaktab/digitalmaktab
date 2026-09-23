using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Branch")]
    public class Branch : Base
    {
        public required string BranchName { get; set; }
        public required Guid SchoolId { get; set; }
        public required School School { get; set; }
    }
}