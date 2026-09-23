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

        // Per-country configuration (Phase A step 3 of docs/globalization.md).
        // Defaults are applied via DataContext.OnModelCreating so existing rows migrate cleanly.
        public required CalendarSystem CalendarSystem { get; set; }
        public required string DefaultLanguageCode { get; set; }
        public required string CurrencyCode { get; set; }
        public required int GradeCount { get; set; }

        [NotMapped]
        public required int CId { get; set; }
    }
}