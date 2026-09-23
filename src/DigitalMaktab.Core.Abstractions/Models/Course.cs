using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// Represents a course in the digitalmaktabapi system.
/// </summary>
namespace digitalmaktabapi.Models
{
    [Table("Course")]
    public class Course : Base
    {
        /// <summary>
        /// Gets or sets the unique identifier for the class associated with this course.
        /// </summary>
        public required Guid ClassId { get; set; }

        /// <summary>
        /// Gets or sets the class associated with this course.
        /// </summary>
        public required Class Class { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier for the subject associated with this course.
        /// </summary>
        public required Guid SubjectId { get; set; }

        /// <summary>
        /// Gets or sets the subject associated with this course.
        /// </summary>
        public required Subject Subject { get; set; }

        public required Guid TeacherId { get; set; }
        public required Teacher Teacher { get; set; }

        /// <summary>
        /// Gets or sets the Course Sections associated with this course.
        /// </summary>
        public required ICollection<CourseSection> CourseSections { get; set; } = [];


    }
}