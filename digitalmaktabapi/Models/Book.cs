using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Book")]
    public class Book : Base
    {
        public Guid? SchoolId { get; set; }
        public School? School { get; set; }
        public required string BookTitle { get; set; }

    }
}