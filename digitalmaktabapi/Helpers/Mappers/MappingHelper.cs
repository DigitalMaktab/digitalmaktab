using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Helpers.Mappers
{
    public static class MappingHelper
    {
        public static void ApplyMappingConvention(Profile profile, Type baseSourceType, Type baseDestinationType, IStringLocalizer<MainController> localizer, params (Type Source, Type Destination)[] mapTypes)
        {
            foreach (var (Source, Destination) in mapTypes)
            {
                var map = profile.CreateMap(Source, Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);

                var sourceProperties = Source.GetProperties();
                var destinationProperties = Destination.GetProperties();

                foreach (var sourceProperty in sourceProperties)
                {
                    // Check if the source property is an enum or a nullable enum
                    bool isEnum = sourceProperty.PropertyType.IsEnum ||
                                  (Nullable.GetUnderlyingType(sourceProperty.PropertyType)?.IsEnum ?? false);

                    if (isEnum)
                    {
                        var destinationProperty = destinationProperties
                            .FirstOrDefault(dp => dp.Name == sourceProperty.Name && dp.PropertyType == typeof(string));

                        if (destinationProperty != null)
                        {
                            map.ForMember(destinationProperty.Name, opt => opt.MapFrom((src, dest) =>
                            {
                                // Get the value of the source property
                                var value = sourceProperty.GetValue(src);

                                // Return null if the value is null
                                if (value == null) return null;

                                // Cast the value to Enum and get the localized string
                                var enumValue = (Enum)value;
                                return localizer[enumValue.ToString()];
                            }));
                        }
                    }
                }
            }
        }
    }
}