using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DotCommon.Extensions;
using FluentValidation;

namespace digitalmaktabapi.Models
{
    public class AddScheduleDto
    {
        public required Guid CourseId { get; set; }
        public required Guid TeacherId { get; set; }
        public required DayOfWeek DayOfWeek { get; set; }
        public required ScheduleTime ScheduleTime { get; set; }
    }

    public class AddScheduleDtoValidator : AbstractValidator<AddScheduleDto>
    {
        public AddScheduleDtoValidator()
        {
            RuleFor(a => a.CourseId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.TeacherId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.DayOfWeek).IsInEnum().NotNull();
            RuleFor(a => a.ScheduleTime).IsInEnum().NotNull();
        }
    }
}