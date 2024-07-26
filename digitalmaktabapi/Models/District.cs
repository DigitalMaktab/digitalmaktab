using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("District")]
    public class District : Base
    {
        public required string DistrictName { get; set; }
        public required Guid CityId { get; set; }
        public required City City { get; set; }
    }
}