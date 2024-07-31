using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace digitalmaktabapi.Helpers
{
    public class CamelCaseDocumentFilter : IDocumentFilter
    {
        public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
        {
            var paths = swaggerDoc.Paths.ToDictionary(
                entry => ConvertToCamelCase(entry.Key),

                entry => entry.Value
            );

            swaggerDoc.Paths = [];
            foreach (var pathItem in paths)
            {
                swaggerDoc.Paths.Add(pathItem.Key, pathItem.Value);
            }
        }

        private static string ConvertToCamelCase(string path)
        {
            var segments = path.Split('/').Select(segment =>
                string.IsNullOrEmpty(segment) || char.IsLower(segment, 0)
                    ? segment
                    : char.ToLowerInvariant(segment[0]) + segment.Substring(1)
            );

            return string.Join('/', segments);
        }
    }
}