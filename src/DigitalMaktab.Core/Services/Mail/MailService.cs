using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace digitalmaktabapi.Services.Mail
{
    public class MailService(IOptions<MailSettings> mailSettingsOptions) : IMailService
    {
        private readonly MailSettings mailSettingsOptions = mailSettingsOptions.Value;

        public async Task<bool> SendMail(MailData mailData)
        {
            try
            {
                using MimeMessage emailMessage = new();
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
                using SmtpClient mailClient = new();
                await mailClient.ConnectAsync(mailSettingsOptions.Server, mailSettingsOptions.Port, MailKit.Security.SecureSocketOptions.StartTls);
                await mailClient.AuthenticateAsync(mailSettingsOptions.UserName, mailSettingsOptions.Password);
                await mailClient.SendAsync(emailMessage);
                await mailClient.DisconnectAsync(true);

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
            return $@"
                    <!DOCTYPE html>
                    <html lang='en'>
                    <head>
                        <meta charset='UTF-8'>
                        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                        <title>{mailData.EmailSubject}</title>
                        <style>
                            body {{
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 0;
                            }}
                            .email-container {{
                                max-width: 600px;
                                margin: auto;
                                background-color: #ffffff;
                                padding: 20px;
                                border-radius: 8px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                            }}
                            .email-header {{
                                text-align: center;
                                background-color: #43B9B2;
                                color: #ffffff;
                                padding: 10px;
                                font-size: 24px;
                                font-weight: bold;
                                border-radius: 8px 8px 0 0;
                            }}
                            .email-body {{
                                padding: 20px;
                                color: #333333;
                                line-height: 1.6;
                            }}
                            .email-footer {{
                                text-align: center;
                                color: #888888;
                                font-size: 12px;
                                padding: 10px;
                                border-top: 1px solid #dddddd;
                                margin-top: 20px;
                            }}
                            .btn {{
                                display: inline-block;
                                background-color: #43B9B2;
                                color: #ffffff;
                                padding: 10px 20px;
                                border-radius: 5px;
                                text-decoration: none;
                                font-weight: bold;
                            }}
                            .btn:hover {{
                                background-color: #3aa49b;
                            }}
                        </style>
                    </head>
                    <body>
                        <div class='email-container'>
                            <div class='email-header'>
                                {mailData.EmailSubject}
                            </div>
                            <div class='email-body'>
                                <p>Dear {mailData.EmailToName},</p>
                                <div>{mailData.EmailBody}</div>
                            </div>
                            {mailData.EmailFooter}
                        </div>
                    </body>
                    </html>";
        }

        public async Task<bool> SendGrid(MailData mailData)
        {
            try
            {
                var client = new SendGridClient(mailSettingsOptions.SendGridApiKey);
                var from = new EmailAddress(mailSettingsOptions.SenderEmail, mailSettingsOptions.SenderName);
                var to = new EmailAddress(mailData.EmailToId, mailData.EmailToName);
                var msg = MailHelper.CreateSingleEmail(from, to, mailData.EmailSubject, null, ReturnHtmlBody(mailData));

                var response = await client.SendEmailAsync(msg);

                if (response.StatusCode == System.Net.HttpStatusCode.Accepted)
                {
                    return true;
                }

                Console.WriteLine($"Failed to send email via SendGrid. Status Code: {response.StatusCode}");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                return false;
            }
        }
    }
}