using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class SchoolMapper : Profile
    {
        public SchoolMapper()
        {
            ApplyMappingConvention(typeof(Base), typeof(BaseDto));
            CreateMap<SchoolForAddDto, School>();
            CreateMap<AddCalendarYearDto, CalendarYear>();
            CreateMap<AddBranchDto, Branch>();
        }

        private void ApplyMappingConvention(Type baseSourceType, Type baseDestinationType)
        {
            var mapTypes = new[]
            {
                new { Source = typeof(School), Destination = typeof(SchoolDto) },
                new { Source = typeof(CalendarYear), Destination = typeof(CalendarYearDto) },
                new { Source = typeof(Branch), Destination = typeof(BranchDto) }
            };

            foreach (var mapType in mapTypes)
            {
                var map = CreateMap(mapType.Source, mapType.Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);
            }
        }
    }
}