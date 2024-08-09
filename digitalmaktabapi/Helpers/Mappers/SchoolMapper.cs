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
            CreateMap<School, SchoolDto>();
            CreateMap<SchoolForAddDto, School>();
            CreateMap<AddCalendarYearDto, CalendarYear>();
            CreateMap<CalendarYear, CalendarYearDto>();
        }
    }
}