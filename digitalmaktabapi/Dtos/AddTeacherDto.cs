using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddTeacherDto
    {
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required DateOnly DateOfBirth { get; set; }
        public required Gender Gender { get; set; }
        public required AddAddressDto PrimaryAddress { get; set; }
        public required AddPhoneNumberDto PhoneNumber { get; set; }
        public required UserRole UserRole { get; set; }
        public required string Email { get; set; }
    }

    public class AddTeacherDtoValidator : AbstractValidator<AddTeacherDto>
    {
        public AddTeacherDtoValidator()
        {
            RuleFor(a => a.FirstName).NotEmpty();
            RuleFor(a => a.LastName).NotEmpty();
            RuleFor(a => a.PrimaryAddress).NotEmpty();
            RuleFor(a => a.PhoneNumber).NotEmpty();
            RuleFor(a => a.Email).NotEmpty();
            RuleFor(a => a.UserRole).NotNull().IsInEnum();
        }
    }

}