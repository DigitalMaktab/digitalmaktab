using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Helpers
{
    public class EnumResolver<TSource, TEnum>(IStringLocalizer<TEnum> localizer) : IValueResolver<TSource, object, string>
    where TEnum : Enum
    {
        private readonly IStringLocalizer _localizer = localizer;

        public string Resolve(TSource source, object destination, string destMember, ResolutionContext context)
        {
            var enumValue = (TEnum)context.Items["EnumValue"];
            if (enumValue == null)
            {
                return null;
            }

            string resourceKey = $"{typeof(TEnum).Name}";
            return _localizer[resourceKey];
        }
    }
}