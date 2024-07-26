using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class CountryDto : BaseDto
    {
        public required string CountryName { get; set; }
        public required string CountryCode { get; set; }
        public required string CountryPhoneCode { get; set; }
        public required ICollection<CityDto> Cities { get; set; }
    }
}