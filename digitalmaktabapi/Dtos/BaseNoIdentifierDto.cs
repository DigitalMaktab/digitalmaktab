using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class BaseNoIdentifierDto
    {
        public Guid? CreationUserId { get; set; }
        public DateTime? CreationDate { get; set; }
        public Guid? UpdateUserId { get; set; }
        public DateTime? UpdateDate { get; set; }
        public required bool Status { get; set; }
    }
}