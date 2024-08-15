using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;

namespace digitalmaktabapi.Helpers.Mappers
{
    public static class MappingHepler
    {
        public static void ApplyMappingConvention(Profile profile, Type baseSourceType, Type baseDestinationType, params (Type Source, Type Destination)[] mapTypes)
        {
            foreach (var (Source, Destination) in mapTypes)
            {
                var map = profile.CreateMap(Source, Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);
            }
        }
    }
}