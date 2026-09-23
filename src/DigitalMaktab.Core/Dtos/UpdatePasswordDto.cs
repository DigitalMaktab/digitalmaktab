using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class UpdatePasswordDto
    {
        public required string CurrentPassword { get; set; }
        public required string NewPassword { get; set; }
        public required string ConfirmPassword { get; set; }
    }

    public class UpdatePasswordDtoValidator : AbstractValidator<UpdatePasswordDto>
    {
        public UpdatePasswordDtoValidator()
        {
            RuleFor(a => a.CurrentPassword)
                .NotEmpty()
                .NotNull()
                .MinimumLength(8);

            RuleFor(a => a.NewPassword)
                .NotEmpty()
                .NotNull()
                .MinimumLength(8);

            RuleFor(a => a.ConfirmPassword)
                .NotEmpty()
                .NotNull()
                .Matches(a => a.NewPassword);
        }
    }
}