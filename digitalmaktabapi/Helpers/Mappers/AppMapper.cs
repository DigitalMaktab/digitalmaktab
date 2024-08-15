using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class AppMapper : Profile
    {
        public AppMapper()
        {

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

            MappingHepler.ApplyMappingConvention(this, typeof(Base), typeof(BaseDto),
                (typeof(Country), typeof(CountryDto)),
                (typeof(City), typeof(CityDto)),
                (typeof(District), typeof(DistrictDto))
            );
        }
    }
}