using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Helpers.Validators;
using FluentValidation;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Dtos
{
    public class LoginDto
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
    }

    public class LoginDtoValidator : AbstractValidator<LoginDto>
    {
        public LoginDtoValidator(IStringLocalizer<GeneralValidation> localizer)
        {
            RuleFor(a => a.Email)
                .NotEmpty()
                .EmailAddress()
                .NotNull();
            RuleFor(a => a.Password)
                .NotEmpty()
                .NotNull()
                .MinimumLength(8);
        }
    }
}