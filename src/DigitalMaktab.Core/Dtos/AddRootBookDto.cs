using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Helpers;
using FluentValidation;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Dtos
{
    public class AddRootBookDto
    {
        public required string BookTitle { get; set; }
        public required IFormFile File { get; set; }
    }

    public class AddRootBookDtoValidator : AbstractValidator<AddRootBookDto>
    {
        public AddRootBookDtoValidator(IStringLocalizer<MainController> localizer)
        {
            RuleFor(a => a.BookTitle).NotEmpty();
            RuleFor(a => a.File)
            .NotNull()
            .ValidateFile(maxSize: 20 * 1024 * 1024, localizer, allowedExtensions: [".pdf"]);
        }
    }
}