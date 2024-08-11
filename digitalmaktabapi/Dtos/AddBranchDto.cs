using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation;

namespace digitalmaktabapi.Dtos
{
    public class AddBranchDto
    {
        public required string BranchName { get; set; }
    }

    public class AddBranchDtoValidator : AbstractValidator<AddBranchDto>
    {
        public AddBranchDtoValidator()
        {
            RuleFor(a => a.BranchName).NotEmpty();
        }
    }
}