using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddCourseSectionDto
    {
        public required Guid CourseId { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required ICollection<AddLearningMaterialDto> LearningMaterials { get; set; } = [];
    }


    public class AddCourseSectionDtoValidator : AbstractValidator<AddCourseSectionDto>
    {
        public AddCourseSectionDtoValidator()
        {
            RuleFor(a => a.CourseId).NotEmpty();
            RuleFor(a => a.Title).NotEmpty();
            RuleFor(a => a.Description).NotEmpty();
            RuleFor(a => a.LearningMaterials).NotEmpty();
        }
    }
}