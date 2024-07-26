using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

namespace digitalmaktabapi.Services.Mail
{
    public class MailService : IMailService
    {
        private readonly MailSettings mailSettingsOptions;

        public MailService(IOptions<MailSettings> mailSettingsOptions)
        {
            this.mailSettingsOptions = mailSettingsOptions.Value;
        }
        public async Task<bool> SendMail(MailData mailData)
        {
            try
            {
                using (MimeMessage emailMessage = new())
                {
                    MailboxAddress emailFrom = new(mailSettingsOptions.SenderName, mailSettingsOptions.SenderEmail);
                    emailMessage.From.Add(emailFrom);
                    MailboxAddress emailTo = new(mailData.EmailToName, mailData.EmailToId);
                    emailMessage.To.Add(emailTo);

                    // you can add the CCs and BCCs here.
                    //emailMessage.Cc.Add(new MailboxAddress('Cc Receiver', 'cc@example.com'));
                    //emailMessage.Bcc.Add(new MailboxAddress('Bcc Receiver', 'bcc@example.com'));

                    emailMessage.Subject = mailData.EmailSubject;

                    BodyBuilder emailBodyBuilder = new()
                    {
                        HtmlBody = ReturnHtmlBody(mailData)
                    };

                    emailMessage.Body = emailBodyBuilder.ToMessageBody();
                    //this is the SmtpClient from the Mailkit.Net.Smtp namespace, not the System.Net.Mail one
                    using (SmtpClient mailClient = new())
                    {
                        await mailClient.ConnectAsync(mailSettingsOptions.Server, mailSettingsOptions.Port, MailKit.Security.SecureSocketOptions.StartTls);
                        await mailClient.AuthenticateAsync(mailSettingsOptions.UserName, mailSettingsOptions.Password);
                        await mailClient.SendAsync(emailMessage);
                        await mailClient.DisconnectAsync(true);
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        private static string ReturnHtmlBody(MailData mailData)
        {
            // TODO:: Design an HTML template ad return it with data.
            return $"<pre>{mailData.EmailBody}</pre>";
        }

    }
}