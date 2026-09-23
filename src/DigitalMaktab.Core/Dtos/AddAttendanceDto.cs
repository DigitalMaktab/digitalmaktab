using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddAttendanceDto
    {
        public required ICollection<AttendanceAddDto> Attendances { get; set; }
    }

    public class AddAttendanceDtoValidator : AbstractValidator<AddAttendanceDto>
    {
        public AddAttendanceDtoValidator()
        {
            RuleFor(a => a.Attendances).NotEmpty().NotNull();
            // Validate each attendance
            RuleForEach(a => a.Attendances).SetValidator(new AttendanceAddDtoValidator());
        }
    }

    public class AttendanceAddDto
    {
        public required Guid EnrollmentId { get; set; }
        public required bool Status { get; set; }
    }

    public class AttendanceAddDtoValidator : AbstractValidator<AttendanceAddDto>
    {
        public AttendanceAddDtoValidator()
        {
            RuleFor(a => a.EnrollmentId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.Status)
                .NotNull();
        }
    }
}