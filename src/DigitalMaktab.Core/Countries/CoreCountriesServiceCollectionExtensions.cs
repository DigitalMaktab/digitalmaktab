using DigitalMaktab.Core.Abstractions.Countries;
using Microsoft.Extensions.DependencyInjection;

namespace digitalmaktabapi.Countries
{
    // DI wiring for Core-owned country pieces. Call this BEFORE any country
    // module registrations in Program.cs so country modules can override
    // Core defaults (e.g. Afghanistan's SolarHijriCalendarProvider replaces
    // Core's default for that CalendarSystem).
    public static class CoreCountriesServiceCollectionExtensions
    {
        public static IServiceCollection AddCoreCalendarProviders(this IServiceCollection services)
        {
            services.AddScoped<ICalendarProvider, GregorianCalendarProvider>();
            services.AddScoped<ICalendarProviderResolver, CalendarProviderResolver>();
            return services;
        }
    }
}
