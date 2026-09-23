using digitalmaktabapi.Models;

namespace DigitalMaktab.Core.Abstractions.Countries
{
    // DI-time dispatch: given a country's CalendarSystem, return the registered
    // ICalendarProvider implementation. Callers with a School typically use
    // `resolver.For(school.Country.CalendarSystem)`.
    //
    // Behavior when the requested CalendarSystem has no registered implementation
    // is deliberately left to the concrete resolver — the default in Core throws
    // rather than silently falling back, so misconfiguration is loud.
    public interface ICalendarProviderResolver
    {
        ICalendarProvider For(CalendarSystem system);
    }
}
