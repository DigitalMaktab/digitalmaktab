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
    public class AddLearningMaterialDto
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public IFormFile? File { get; set; }
        public required LearningMaterialType LearningMaterialType { get; set; }
        public IFormFile? Thumbnail { get; set; }
    }

    public class AddLearningMaterialDtoValidator : AbstractValidator<AddLearningMaterialDto>
    {
        public AddLearningMaterialDtoValidator(IStringLocalizer<MainController> localizer)
        {
            RuleFor(a => a.Title).NotEmpty();
            RuleFor(a => a.Description).NotEmpty();
            RuleFor(a => a.LearningMaterialType).NotNull().IsInEnum();
            RuleFor(a => a.File)
                .NotEmpty()
                .When(a => a.LearningMaterialType != LearningMaterialType.LINK
                        && a.LearningMaterialType != LearningMaterialType.OTHER
                        && a.LearningMaterialType != LearningMaterialType.CODE)
                .ValidateFile(maxSize: 2000 * 1024 * 1024, localizer: localizer, allowedExtensions: [".mp4", ".pdf", ".docx", ".xlsx", ".pptx", ".jpg", ".png", ".gif", ".txt", ".zip"]);
            RuleFor(a => a.Thumbnail)
                .NotEmpty()
                .When(a => a.LearningMaterialType == LearningMaterialType.VIDEO)
                .ValidateFile(maxSize: 1 * 1024 * 1024, localizer: localizer, allowedExtensions: [".jpg", ".png"]);
        }
    }
}