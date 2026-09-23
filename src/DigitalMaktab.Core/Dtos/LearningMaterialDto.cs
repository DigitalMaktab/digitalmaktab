using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Dtos
{
    public class LearningMaterialDto : BaseDto
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public string? FilePath { get; set; }
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public required LearningMaterialType LearningMaterialType { get; set; }
        public string? ThumbnailPath { get; set; }
    }
}