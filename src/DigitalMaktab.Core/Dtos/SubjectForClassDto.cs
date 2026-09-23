using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class SubjectForClassDto : BaseDto
    {
        public required string SubjectName { get; set; }
        public required Guid BookId { get; set; }
        public required BookForClassDto Book { get; set; }

    }
}