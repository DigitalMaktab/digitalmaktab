using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddSubjectDto
    {
        public required string SubjectName { get; set; }
        public required Guid BookId { get; set; }
    }

    public class AddSubjectDtoValidator : AbstractValidator<AddSubjectDto>
    {
        public AddSubjectDtoValidator()
        {
            RuleFor(a => a.SubjectName).NotNull().NotEmpty();
            RuleFor(a => a.BookId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
        }
    }
}