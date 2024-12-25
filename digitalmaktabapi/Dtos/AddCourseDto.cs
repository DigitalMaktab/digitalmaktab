using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddCourseDto
    {
        public required Guid ClassId { get; set; }
        public required Guid SubjectId { get; set; }
    }


    public class AddCourseDtoValidator : AbstractValidator<AddCourseDto>
    {
        public AddCourseDtoValidator()
        {
            RuleFor(a => a.ClassId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.SubjectId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
        }
    }
}