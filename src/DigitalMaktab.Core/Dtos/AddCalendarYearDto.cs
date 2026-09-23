using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddCalendarYearDto
    {
        public required DateOnly Year { get; set; }
        public required string NativeYear { get; set; }
    }

    public class AddCalendarYearDtoValidator : AbstractValidator<AddCalendarYearDto>
    {
        public AddCalendarYearDtoValidator()
        {
            RuleFor(a => a.Year).NotEmpty();
            RuleFor(a => a.NativeYear).NotEmpty();
        }
    }
}