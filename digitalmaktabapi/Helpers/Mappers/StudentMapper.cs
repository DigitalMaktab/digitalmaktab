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
            MappingHepler.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto),
                (typeof(Student), typeof(StudentDto))
            );
        }
    }


}