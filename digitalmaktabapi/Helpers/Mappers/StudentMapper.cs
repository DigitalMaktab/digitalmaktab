using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class StudentMapper : Profile
    {

        public StudentMapper()
        {
            ApplyMappingConvention(typeof(Base), typeof(BaseDto));
        }


        private void ApplyMappingConvention(Type baseSourceType, Type baseDestinationType)
        {
            var mapTypes = new[]
            {
                new { Source = typeof(Student), Destination = typeof(StudentDto) }
            };

            foreach (var mapType in mapTypes)
            {
                var map = CreateMap(mapType.Source, mapType.Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);
            }
        }
    }


}