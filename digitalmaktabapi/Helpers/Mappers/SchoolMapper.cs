using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.domain.SchoolDashboard;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Dtos.SchoolDashboard;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services;
using DotCommon.Extensions;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class SchoolMapper : Profile
    {
        private readonly IStringLocalizer<MainController> localizer;
        public SchoolMapper()
        {
            this.localizer = ServiceLocator.ServiceProvider!.GetService<IStringLocalizer<MainController>>()!;
            CreateMap<SchoolForAddDto, School>();
            CreateMap<AddAddressDto, Address>();
            CreateMap<AddPhoneNumberDto, PhoneNumber>();
            CreateMap<AddCalendarYearDto, CalendarYear>();
            CreateMap<AddBranchDto, Branch>();
            CreateMap<AddTeacherDto, Teacher>();
            CreateMap<AddClassDto, Class>();
            CreateMap<AddStudentDto, Student>();
            CreateMap<AddCourseDto, Course>();
            CreateMap<AddEnrollmentDto, Enrollment>();
            CreateMap<AddScheduleDto, Schedule>();

            CreateMap<ClassEnrollmentChartDomain, ClassEnrollmentChartDto>()
                .ForMember(dest => dest.ClassNameAndBranch, opt => opt.MapFrom(src => localizer[src.ClassName.ToString()].Value + " " + src.BranchName));

            var customResolvers = new Dictionary<(Type Source, string SourceField), IMemberValueResolver<object, object, string, string>>
            {

            };

            MappingHelper.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto), localizer, customResolvers,
                (typeof(School), typeof(SchoolDto)),
                (typeof(CalendarYear), typeof(CalendarYearDto)),
                (typeof(Branch), typeof(BranchDto)),
                (typeof(Class), typeof(ClassDto)),
                (typeof(Course), typeof(CourseDto)),
                (typeof(Course), typeof(CourseForClassDto)),
                (typeof(Enrollment), typeof(EnrollmentDto)),
                (typeof(Schedule), typeof(ScheduleDto))
            );
        }
    }
}