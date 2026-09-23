using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class PhoneNumberDto
    {
        public required Guid CountryId { get; set; }
        public required CountryDto Country { get; set; }
        public required string Number { get; set; }
    }
}