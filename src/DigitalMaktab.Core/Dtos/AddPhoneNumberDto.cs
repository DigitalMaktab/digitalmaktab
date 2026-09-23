using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class AddPhoneNumberDto
    {
        public required Guid CountryId { get; set; }
        public required string Number { get; set; }
    }
}