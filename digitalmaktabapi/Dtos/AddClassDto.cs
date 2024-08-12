using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;
using DotCommon.Extensions;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddClassDto
    {
        public required ClassName ClassName { get; set; }
        public required Guid BranchId { get; set; }
        public required Guid CalendarYearId { get; set; }
        public required ClassType ClassType { get; set; }
        public required Shift Shift { get; set; }
        public required Guid TeacherId { get; set; }
    }

    public class AddClassDtoValidator : AbstractValidator<AddClassDto>
    {
        public AddClassDtoValidator()
        {
            RuleFor(a => a.BranchId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
            RuleFor(a => a.CalendarYearId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);
            RuleFor(a => a.TeacherId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.ClassName).NotEmpty();
            RuleFor(a => a.ClassType).IsInEnum().NotEmpty();
            RuleFor(a => a.Shift).IsInEnum().NotEmpty();
        }
    }
}