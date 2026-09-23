using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("LearningMaterial")]
    public class LearningMaterial : Base
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public string? FilePath { get; set; }
        public string? FileName { get; set; }
        public string? ContentType { get; set; }

        public required LearningMaterialType LearningMaterialType { get; set; }
        public string? ThumbnailPath { get; set; }
        public required Guid CourseSectionId { get; set; }
        public required CourseSection CourseSection { get; set; }
    }
}