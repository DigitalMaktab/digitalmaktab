using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    public class PhoneNumber
    {
        public required Guid CountryId { get; set; }
        public required Country Country { get; set; }
        public required string Number { get; set; }
    }
}