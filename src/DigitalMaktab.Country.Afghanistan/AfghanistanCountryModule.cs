using DigitalMaktab.Core.Abstractions.Countries;
using DigitalMaktab.Country.Afghanistan.Providers;
using Microsoft.Extensions.DependencyInjection;

namespace DigitalMaktab.Country.Afghanistan
{
    // Afghanistan country module. Program.cs calls
    //   services.AddCoreCalendarProviders().AddAfghanistanModule();
    // to register the Solar Hijri calendar provider alongside Core defaults.
    //
    // Adding a new country = write a new .Country.<X> project with the
    // same shape (an AddXxxModule extension registering its providers).
    public static class AfghanistanCountryModuleExtensions
    {
        public static IServiceCollection AddAfghanistanModule(this IServiceCollection services)
        {
            services.AddScoped<ICalendarProvider, SolarHijriCalendarProvider>();
            return services;
        }
    }
}
