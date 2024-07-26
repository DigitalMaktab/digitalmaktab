using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Data;

namespace digitalmaktabapi.Services.Upload
{
    public class UploadResponse : Response
    {
        public string? Path { get; set; }
    }
}