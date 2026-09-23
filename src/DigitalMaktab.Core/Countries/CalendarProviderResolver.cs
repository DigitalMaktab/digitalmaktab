using digitalmaktabapi.Models;
using DigitalMaktab.Core.Abstractions.Countries;

namespace digitalmaktabapi.Countries
{
    // Default resolver: keeps a dictionary of registered ICalendarProvider
    // implementations keyed by their CalendarSystem. Populated by each
    // country module's AddXxxModule() extension registering its provider
    // as a scoped ICalendarProvider — this resolver picks the matching one
    // at request time.
    public class CalendarProviderResolver : ICalendarProviderResolver
    {
        private readonly IReadOnlyDictionary<CalendarSystem, ICalendarProvider> providers;

        public CalendarProviderResolver(IEnumerable<ICalendarProvider> providers)
        {
            // If two modules register a provider for the same CalendarSystem,
            // the LAST one wins. Order is defined by Program.cs's DI registration
            // order — country modules should register their providers AFTER
            // AddCoreCalendarProviders() to override the Core default.
            var map = new Dictionary<CalendarSystem, ICalendarProvider>();
            foreach (var p in providers) map[p.System] = p;
            this.providers = map;
        }

        public ICalendarProvider For(CalendarSystem system)
        {
            if (!this.providers.TryGetValue(system, out var provider))
                throw new InvalidOperationException(
                    $"No ICalendarProvider is registered for CalendarSystem '{system}'. " +
                    $"Ensure the corresponding country module is registered in Program.cs.");
            return provider;
        }
    }
}
