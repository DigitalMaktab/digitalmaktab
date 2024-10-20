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
        private readonly IStringLocalizer<CountryResolver> countryLocalizer;
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


            this.countryLocalizer = ServiceLocator.ServiceProvider!.GetService<IStringLocalizer<CountryResolver>>()!;
            var countryResolver = new CountryResolver(countryLocalizer);
            var customResolvers = new Dictionary<(Type Source, string SourceField), IMemberValueResolver<object, object, string, string>>
            {
                { (typeof(Country), "CountryName"), countryResolver }
            };

            MappingHelper.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto), localizer, customResolvers,
                (typeof(Country), typeof(CountryDto)),
                (typeof(City), typeof(CityDto)),
                (typeof(District), typeof(DistrictDto)),
                (typeof(Subject), typeof(SubjectDto)),
                (typeof(Subject), typeof(SubjectForClassDto)),
                (typeof(Book), typeof(BookDto)),
                (typeof(Book), typeof(BookForClassDto)),
                (typeof(User), typeof(UserDto)),
                (typeof(CalendarYear), typeof(CalendarYearDto))
            );
        }
    }

    public class CountryResolver(IStringLocalizer<CountryResolver> localizer) : IMemberValueResolver<object, object, string, string>
    {
        private readonly IStringLocalizer<CountryResolver> localizer = localizer;

        public string Resolve(object source, object destination, string sourceMember, string destMember,
            ResolutionContext context)
        {
            return this.localizer[sourceMember];
        }
    }
}