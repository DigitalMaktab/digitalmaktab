using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;
using DotCommon.Extensions;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddStudentDto
    {
        public required string FirstNameNative { get; set; }
        public required string LastNameNative { get; set; }
        public required string FatherNameNative { get; set; }
        public required string GrandFatherNameNative { get; set; }
        public required string FirstNameEnglish { get; set; }
        public required string LastNameEnglish { get; set; }
        public required string FatherNameEnglish { get; set; }
        public required string GrandFatherNameEnglish { get; set; }
        public required int AsasNumber { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required Guid JoiningClassId { get; set; }
        public required Guid CurrentClassId { get; set; }
        public required AddAddressDto PrimaryAddress { get; set; }
        public required AddAddressDto SecondaryAddress { get; set; }
        public NationalIdDto? NationalId { get; set; }
        public string? BrotherName { get; set; }
        public string? FUncleName { get; set; }
        public string? FCousinName { get; set; }
        public string? MUncleName { get; set; }
        public string? MCousinName { get; set; }
        public AddPhoneNumberDto? PhoneNumber { get; set; }
        public BloodGroup? BloodGroup { get; set; }
        public DisabilityType DisabilityType { get; set; }
        public IsOrphan IsOrphan { get; set; }
        public Language MotherTongue { get; set; }

        public required DateTime DateOfBirth { get; set; }
        public required Gender Gender { get; set; }
        public required string Email { get; set; }
        public decimal? MonthlyFee { get; set; }
    }

    public class AddStudentDtoValidator : AbstractValidator<AddStudentDto>
    {
        public AddStudentDtoValidator()
        {
            RuleFor(a => a.FirstNameNative).NotNull().NotEmpty();
            RuleFor(a => a.LastNameNative).NotNull().NotEmpty();
            RuleFor(a => a.FatherNameNative).NotNull().NotEmpty();
            RuleFor(a => a.GrandFatherNameNative).NotNull().NotEmpty();

            RuleFor(a => a.FirstNameEnglish).NotNull().NotEmpty();
            RuleFor(a => a.LastNameEnglish).NotNull().NotEmpty();
            RuleFor(a => a.FatherNameEnglish).NotNull().NotEmpty();
            RuleFor(a => a.GrandFatherNameEnglish).NotNull().NotEmpty();
            RuleFor(a => a.AsasNumber).NotNull().NotEmpty();
            RuleFor(a => a.CalendarYearId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
            RuleFor(a => a.JoiningClassId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
            RuleFor(a => a.CurrentClassId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.PrimaryAddress).NotNull().NotEmpty();
            RuleFor(a => a.SecondaryAddress).NotNull().NotEmpty();

            RuleFor(a => a.DisabilityType).NotEmpty().NotNull().IsInEnum();
            RuleFor(a => a.IsOrphan).NotEmpty().NotNull().IsInEnum();
            RuleFor(a => a.MotherTongue).NotEmpty().NotNull().IsInEnum();
            RuleFor(a => a.Gender).NotEmpty().NotNull().IsInEnum();
            RuleFor(a => a.DateOfBirth).NotEmpty().NotNull();
            RuleFor(a => a.Email).NotEmpty().NotNull().EmailAddress();
        }
    }
}