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
        public static void ApplyMappingConvention(Profile profile,
                                                  Type baseSourceType,
                                                  Type baseDestinationType,
                                                  IStringLocalizer<MainController> localizer,
                                                  Dictionary<(Type Source, string SourceField), IMemberValueResolver<object, object, string, string>> customResolvers,
                                                  params (Type Source, Type Destination)[] mapTypes)
        {
            foreach (var (Source, Destination) in mapTypes)
            {
                var map = profile.CreateMap(Source, Destination);
                map.IncludeBase(baseSourceType, baseDestinationType);

                var sourceProperties = Source.GetProperties();
                var destinationProperties = Destination.GetProperties();

                foreach (var sourceProperty in sourceProperties)
                {

                    // Map the localized version to the additional field (e.g., classTypeValue)
                    bool isEnum = sourceProperty.PropertyType.IsEnum ||
                                  (Nullable.GetUnderlyingType(sourceProperty.PropertyType)?.IsEnum ?? false);

                    if (isEnum)
                    {
                        var localizedDestinationProperty = destinationProperties
                            .FirstOrDefault(dp => dp.Name == sourceProperty.Name + "Value" && dp.PropertyType == typeof(string));

                        if (localizedDestinationProperty != null)
                        {
                            map.ForMember(localizedDestinationProperty.Name, opt => opt.MapFrom((src, dest) =>
                            {
                                var value = sourceProperty.GetValue(src);
                                if (value == null) return null;

                                var enumValue = (Enum)value;
                                return localizer[enumValue.ToString()];
                            }));
                        }
                    }

                    // Check for custom resolver mappings
                    if (customResolvers.TryGetValue((Source, sourceProperty.Name), out var resolver))
                    {
                        var destinationProperty = destinationProperties
                            .FirstOrDefault(dp => dp.Name == sourceProperty.Name);

                        if (destinationProperty != null)
                        {
                            map.ForMember(destinationProperty.Name,
                                opt => opt.MapFrom((src, dest, _, context) =>
                                {
                                    var sourceValue = sourceProperty.GetValue(src);
                                    return resolver.Resolve(src, dest, sourceValue as string, destinationProperty.Name, context);
                                }));
                        }
                    }
                }
            }
        }
    }
}