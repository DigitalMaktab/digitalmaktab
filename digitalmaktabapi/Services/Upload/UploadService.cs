using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Services.Upload
{
    public static class UploadService
    {
        public static async Task<UploadResponse> Upload(IFormFile file, string path)
        {
            var folderName = Path.Combine("Resources", path);
            var pathToSave = Path.Combine(Directory.GetCurrentDirectory(), folderName.ToLower().Trim().Replace(" ", ""));
            if (!Directory.Exists(pathToSave))
            {
                Directory.CreateDirectory(pathToSave);
            }
            var originalFileName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName?.Trim('"').ToLower();
            if (file.Length > 0 && originalFileName != null)
            {

                var fileName = DateTime.Now.Ticks + "-" + originalFileName.ToLower().Trim().Replace(" ", "");
                var fullPath = Path.Combine(pathToSave, fileName);
                var dbPath = Path.Combine(folderName, fileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                return new UploadResponse
                {
                    Path = dbPath,
                    Status = Data.Status.SUCCESS
                };
            }
            else
            {
                return new UploadResponse
                {
                    Status = Data.Status.SUCCESS
                };
            }
        }
    }
}