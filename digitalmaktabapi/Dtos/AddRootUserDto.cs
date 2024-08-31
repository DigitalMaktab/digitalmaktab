using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddRootUserDto
    {
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Password { get; set; }
        public required string ConfirmPassword { get; set; }
        public required string Email { get; set; }
    }


    public class AddRootUserDtoValidator : AbstractValidator<AddRootUserDto>
    {
        public AddRootUserDtoValidator()
        {
            RuleFor(a => a.FirstName).NotEmpty().NotNull();
            RuleFor(a => a.LastName).NotEmpty().NotNull();
            RuleFor(a => a.Email).NotNull().NotEmpty().EmailAddress();
            RuleFor(a => a.Password).NotEmpty().NotNull().MinimumLength(8);
            RuleFor(a => a.ConfirmPassword).NotEmpty().NotNull().Matches(a => a.Password);
        }
    }
}