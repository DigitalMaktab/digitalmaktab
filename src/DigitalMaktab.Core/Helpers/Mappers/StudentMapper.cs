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

            var customResolvers = new Dictionary<(Type Source, string SourceField), IMemberValueResolver<object, object, string, string>>
            {

            };

            MappingHelper.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto), localizer, customResolvers,
                (typeof(Student), typeof(StudentDto))
            );
        }
    }
}