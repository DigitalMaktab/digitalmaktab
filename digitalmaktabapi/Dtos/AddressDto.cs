using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class AddressDto
    {
        public string? Street { get; set; }
        public Guid? DistrictId { get; set; }
        public DistrictDto? District { get; set; }
        public string? Village { get; set; }
        public string? Region { get; set; }
        public string? PostalCode { get; set; }
    }
}