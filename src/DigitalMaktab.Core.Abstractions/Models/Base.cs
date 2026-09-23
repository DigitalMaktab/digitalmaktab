using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    public class Base : BaseNoIdentifier
    {
        [Key]
        public Guid Id { get; set; }
    }
}