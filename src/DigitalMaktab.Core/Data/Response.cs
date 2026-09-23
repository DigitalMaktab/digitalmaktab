using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Data
{
    public class Response
    {
        public string? Message { get; set; }
        public required Status Status { get; set; }
    }
}