using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    public class Address
    {
        public string? Street { get; set; }
        public Guid? DistrictId { get; set; }
        [ForeignKey("DistrictId")]
        public District? District { get; set; }
        public string? Village { get; set; }
        public string? Region { get; set; }
        public string? PostalCode { get; set; }
        public AddressType? AddressType { get; set; }
    }
}