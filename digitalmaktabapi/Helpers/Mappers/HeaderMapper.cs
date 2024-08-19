using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Headers;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class HeaderMapper : Profile
    {
        public HeaderMapper()
        {
            CreateMap<TeacherParams, UserParams>();
            CreateMap<ClassParams, UserParams>();
            CreateMap<ScheduleParams, UserParams>();
            CreateMap<GeneralParams, UserParams>();
            CreateMap<StudentParams, UserParams>();
            CreateMap<AttendanceParams, UserParams>();
        }
    }
}