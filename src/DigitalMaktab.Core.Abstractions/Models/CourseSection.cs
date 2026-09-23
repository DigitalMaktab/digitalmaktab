using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("CourseSection")]
    public class CourseSection : Base
    {
        /// <summary>
        /// Gets or sets the unique identifier for the course associated with this course section.
        /// </summary>
        public required Guid CourseId { get; set; }

        /// <summary>
        /// Gets or sets the course associated with this course section.
        /// </summary>
        public required Course Course { get; set; }

        public required string Title { get; set; }
        public required string Description { get; set; }

        /// <summary>
        /// Gets or sets the Learning Materials associated with this course section.
        /// </summary>
        public required ICollection<LearningMaterial> LearningMaterials { get; set; } = [];
    }
}