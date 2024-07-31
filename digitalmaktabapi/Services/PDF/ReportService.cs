using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DinkToPdf;
using DinkToPdf.Contracts;

namespace digitalmaktabapi.Services.PDF
{
    public class ReportService
    {
        private readonly IConverter _converter;
        // We can also use primary constructor inseated, througout the application we will use primary one.
        public ReportService(IConverter converter)
        {
            _converter = converter;
        }

        public byte[] GeneratePdf(string htmlContent)
        {
            var headerPath = Path.Combine(Directory.GetCurrentDirectory() + "/Resources/header.html");
            var document = new HtmlToPdfDocument
            {
                GlobalSettings =
            {
                ColorMode = ColorMode.Color,
                Orientation = Orientation.Portrait,
                PaperSize = PaperKind.A2
            },
                Objects =
            {
                new ObjectSettings
                {
                    PagesCount = true,
                    HtmlContent = htmlContent,
                    WebSettings = { DefaultEncoding = "utf-8" },
                    HeaderSettings = { FontName = "Arial", FontSize = 9, Right = "Page [page] of [toPage]", Line = true,
                        HtmUrl =  headerPath}
                }
            }
            };

            Console.WriteLine(headerPath);

            return _converter.Convert(document);
        }
    }
}