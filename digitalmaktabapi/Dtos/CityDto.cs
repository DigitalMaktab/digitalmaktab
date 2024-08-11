using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class CityDto : BaseDto
    {
        public required string StateCode { get; set; }
        public required string StateName { get; set; }

        public Guid CountryId { get; set; }
        public required CountryDto Country { get; set; }
    }
}