using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using FluentValidation;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Dtos
{
    public class SchoolForAddDto
    {
        public required string SchoolName { get; set; }
        public required AddAddressDto Address { get; set; }
        public required AddPhoneNumberDto PhoneNumber { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string ConfirmPassword { get; set; }
        public IFormFile? Logo { get; set; }
        public required int Code { get; set; }
    }


    public class SchoolForAddDtoValidator : AbstractValidator<SchoolForAddDto>
    {
        public SchoolForAddDtoValidator(IStringLocalizer<MainController> localizer)
        {
            RuleFor(a => a.SchoolName).NotEmpty().NotNull();
            RuleFor(a => a.Address).NotNull();
            RuleFor(a => a.PhoneNumber).NotNull();
            RuleFor(a => a.Email).NotNull().NotEmpty().EmailAddress();
            RuleFor(a => a.Password).NotEmpty().NotNull().MinimumLength(8);
            RuleFor(a => a.ConfirmPassword).NotEmpty().NotNull().Matches(a => a.Password);
            RuleFor(a => a.Code).NotNull().NotEmpty();
            RuleFor(a => a.Logo).ValidateFile(maxSize: 1 * 1024 * 1024, localizer, allowedExtensions: [".png", ".jpg"]);
        }
    }
}