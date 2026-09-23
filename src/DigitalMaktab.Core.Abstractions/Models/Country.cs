using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Country")]
    public class Country : Base
    {
        public required string CountryName { get; set; }
        public required string CountryCode { get; set; }
        public required string CountryPhoneCode { get; set; }
        public required ICollection<City> Cities { get; set; }

        [NotMapped]
        public required int CId { get; set; }
    }
}