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
            CreateMap<PhoneNumber, PhoneNumberDto>();
            CreateMap<PhoneNumberDto, PhoneNumber>();
            CreateMap<CountryDto, Country>();
            CreateMap<CityDto, City>();
            CreateMap<DistrictDto, District>();
            ApplyMappingConvention(typeof(Base), typeof(BaseDto));
        }

        private void ApplyMappingConvention(Type baseSourceType, Type baseDestinationType)
        {
            var mapTypes = new[]
            {
                new { Source = typeof(Country), Destination = typeof(CountryDto) },
                new { Source = typeof(City), Destination = typeof(CityDto) },
                new { Source = typeof(District), Destination = typeof(DistrictDto) }
            };

            foreach (var mapType in mapTypes)
            {
                var map = CreateMap(mapType.Source, mapType.Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);
            }
        }
    }
}