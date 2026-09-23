using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services.Mail
{
    public interface IMailService
    {
        Task<bool> SendMail(MailData mailData);

        Task<bool> SendGrid(MailData mailData);


    }
}