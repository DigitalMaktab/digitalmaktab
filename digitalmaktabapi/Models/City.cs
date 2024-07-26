using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("City")]
    public class City : Base
    {
        public required string StateCode { get; set; }
        public required string StateName { get; set; }
        public ICollection<District> Districts { get; set; } = [];

        public Guid CountryId { get; set; }
        public required Country Country { get; set; }

        [NotMapped]
        public required int SId { get; set; }
        [NotMapped]
        public required int CId { get; set; }
    }
}