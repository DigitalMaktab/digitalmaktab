using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class TeacherMapper : Profile
    {
        public TeacherMapper()
        {
            MappingHepler.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto),
                (typeof(Teacher), typeof(TeacherDto))
            );
        }
    }
}