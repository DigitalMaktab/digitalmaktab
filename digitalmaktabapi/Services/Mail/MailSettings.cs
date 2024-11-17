using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.Mail
{
    public class MailSettings
    {
        public required string Server { get; set; }
        public required int Port { get; set; }
        public required string SenderName { get; set; }
        public required string SenderEmail { get; set; }
        public required string UserName { get; set; }
        public required string Password { get; set; }

        public required string SendGridApiKey { get; set; }
    }
}