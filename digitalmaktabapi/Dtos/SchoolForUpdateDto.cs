using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class SchoolForUpdateDto
    {
        public required string SchoolName { get; set; }
        public required AddressDto Address { get; set; }
        public required PhoneNumberDto PhoneNumber { get; set; }
        public IFormFile? Logo { get; set; }
        public required int Code { get; set; }
    }


    public class SchoolForUpdateDtoValidator : AbstractValidator<SchoolForUpdateDto>
    {
        public SchoolForUpdateDtoValidator()
        {
            RuleFor(a => a.SchoolName).NotEmpty().NotNull();
            RuleFor(a => a.Address).NotNull();
            RuleFor(a => a.PhoneNumber).NotNull();
            RuleFor(a => a.Code).NotNull().NotEmpty();
        }
    }
}