using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class StudentMapper : Profile
    {
        private readonly IStringLocalizer<MainController> localizer;
        public StudentMapper()
        {
            this.localizer = ServiceLocator.ServiceProvider!.GetService<IStringLocalizer<MainController>>()!;

            MappingHelper.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto), localizer,
                (typeof(Student), typeof(StudentDto))
            );
        }
    }
}