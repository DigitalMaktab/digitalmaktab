using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class BookForClassDto : BaseDto
    {
        public required string BookTitle { get; set; }
        public required string BookPath { get; set; }
    }
}