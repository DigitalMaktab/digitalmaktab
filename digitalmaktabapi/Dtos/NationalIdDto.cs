using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class NationalIdDto
    {
        public required string ElectoricNationIdNumber { get; set; }
        public int? NationalIdNumber { get; set; }
        public int? Volume { get; set; }
        public int? Page { get; set; }
        public int? RegisterNumber { get; set; }
    }
}