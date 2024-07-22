using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class BaseDto
    {
        public Guid Id { get; set; }
        public required Guid CreationUserId { get; set; }
        public required string CreationUserName { get; set; }
        public required DateTime CreationDate { get; set; }
        public required Guid UpdateUserId { get; set; }
        public required string UpdateUserName { get; set; }
        public required DateTime UpdateDate { get; set; }
        public required bool Status { get; set; }
    }
}