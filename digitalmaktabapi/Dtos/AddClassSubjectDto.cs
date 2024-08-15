using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddClassSubjectDto
    {
        public required Guid ClassId { get; set; }
        public required Guid SubjectId { get; set; }
    }


    public class AddClassSubjectDtoValidator : AbstractValidator<AddClassSubjectDto>
    {
        public AddClassSubjectDtoValidator()
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