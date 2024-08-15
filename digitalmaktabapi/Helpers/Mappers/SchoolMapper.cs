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
            CreateMap<SchoolForAddDto, School>();
            CreateMap<AddCalendarYearDto, CalendarYear>();
            CreateMap<AddBranchDto, Branch>();
            CreateMap<AddTeacherDto, Teacher>();
            CreateMap<AddClassDto, Class>();
            CreateMap<AddStudentDto, Student>();
            CreateMap<AddClassSubjectDto, ClassSubject>();
            CreateMap<AddEnrollmentDto, Enrollment>();
            MappingHepler.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto),
                (typeof(School), typeof(SchoolDto)),
                (typeof(CalendarYear), typeof(CalendarYearDto)),
                (typeof(Branch), typeof(BranchDto)),
                (typeof(Class), typeof(ClassDto)),
                (typeof(ClassSubject), typeof(ClassSubjectDto)),
                (typeof(ClassSubject), typeof(ClassSubjectForClassDto)),
                (typeof(Enrollment), typeof(EnrollmentDto))
            );
        }
    }
}