using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.Mail
{
    public class MailData
    {
        public required string EmailToId { get; set; }
        public required string EmailToName { get; set; }
        public required string EmailSubject { get; set; }
        public required string EmailBody { get; set; }
    }
}