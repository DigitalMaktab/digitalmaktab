using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddEnrollmentDto
    {
        public required Guid StudentId { get; set; }
        public required Guid ClassId { get; set; }
        public required Guid CalendarYearId { get; set; }
    }

    public class AddEnrollmentDtoValidator : AbstractValidator<AddEnrollmentDto>
    {
        public AddEnrollmentDtoValidator()
        {
            RuleFor(a => a.StudentId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.ClassId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.CalendarYearId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
        }
    }
}