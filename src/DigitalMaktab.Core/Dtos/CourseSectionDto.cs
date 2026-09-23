using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos
{
    public class CourseSectionDto : BaseDto
    {
        public required Guid CourseId { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required ICollection<LearningMaterialDto> LearningMaterials { get; set; }
    }
}