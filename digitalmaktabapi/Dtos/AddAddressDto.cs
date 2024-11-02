using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class AddAddressDto
    {
        public string? Street { get; set; }
        public Guid? DistrictId { get; set; }
        public string? Village { get; set; }
        public string? Region { get; set; }
        public string? PostalCode { get; set; }
        public AddressType? AddressType { get; set; }
        public string? AddressTypeValue { get; set; }
    }
}