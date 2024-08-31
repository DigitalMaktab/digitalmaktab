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
    public class AppMapper : Profile
    {
        private readonly IStringLocalizer<MainController> localizer;
        public AppMapper()
        {
            this.localizer = ServiceLocator.ServiceProvider!.GetService<IStringLocalizer<MainController>>()!;
            CreateMap<Address, AddressDto>();
            CreateMap<AddressDto, Address>();
            CreateMap<AddAddressDto, Address>();
            CreateMap<PhoneNumber, PhoneNumberDto>();
            CreateMap<PhoneNumberDto, PhoneNumber>();
            CreateMap<AddPhoneNumberDto, PhoneNumber>();
            CreateMap<CountryDto, Country>();
            CreateMap<CityDto, City>();
            CreateMap<DistrictDto, District>();
            CreateMap<NationalIdDto, NationalId>();
            CreateMap<NationalId, NationalIdDto>();
            CreateMap<AddRootBookDto, Book>();
            CreateMap<AddSubjectDto, Subject>();
            CreateMap<AddRootUserDto, User>();

            MappingHelper.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto), localizer,
                (typeof(Country), typeof(CountryDto)),
                (typeof(City), typeof(CityDto)),
                (typeof(District), typeof(DistrictDto)),
                (typeof(Subject), typeof(SubjectDto)),
                (typeof(Subject), typeof(SubjectForClassDto)),
                (typeof(Book), typeof(BookDto)),
                (typeof(Book), typeof(BookForClassDto)),
                (typeof(User), typeof(UserDto))
            );
        }
    }
}