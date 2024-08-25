using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddGradeDto
    {
        public required ICollection<GradeAddDto> Grades { get; set; }
    }

    public class AddGradeDtoValidator : AbstractValidator<AddGradeDto>
    {
        public AddGradeDtoValidator()
        {
            RuleFor(a => a.Grades).NotNull().NotEmpty();
            // Validate each grade
            RuleForEach(a => a.Grades).SetValidator(new GradeAddDtoValidator());
        }
    }

    public class GradeAddDto
    {
        public required Guid EnrollmentId { get; set; }
        public required Guid ClassSubjectId { get; set; }
        public required ExamType ExamType { get; set; }
        public required decimal Score { get; set; }
    }

    public class GradeAddDtoValidator : AbstractValidator<GradeAddDto>
    {
        public GradeAddDtoValidator()
        {
            RuleFor(a => a.EnrollmentId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.ClassSubjectId)
                .NotNull()
                .NotEmpty()
                .Must(a => a != Guid.Empty);

            RuleFor(a => a.ExamType).NotNull().IsInEnum();

            When(a => a.ExamType == ExamType.MID_TERM, () =>
            {
                RuleFor(a => a.Score)
                .LessThanOrEqualTo(40)
                .GreaterThanOrEqualTo(0);
            });

            When(a => a.ExamType == ExamType.FINAL, () =>
            {
                RuleFor(a => a.Score)
                .LessThanOrEqualTo(60)
                .GreaterThanOrEqualTo(0);
            });
        }
    }
}