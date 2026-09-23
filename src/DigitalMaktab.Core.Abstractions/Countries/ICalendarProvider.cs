using digitalmaktabapi.Models;

namespace DigitalMaktab.Core.Abstractions.Countries
{
    // Country-specific calendar operations. One implementation per CalendarSystem
    // (see SolarHijriCalendarProvider in DigitalMaktab.Country.Afghanistan,
    // GregorianCalendarProvider in DigitalMaktab.Core). Resolved per school via
    // ICalendarProviderResolver.
    public interface ICalendarProvider
    {
        // Which calendar system this provider implements. Used by the resolver
        // to dispatch to the right provider based on School.Country.CalendarSystem.
        CalendarSystem System { get; }

        // Render a Gregorian date as the native-calendar year string
        // (e.g. Solar Hijri "1405" for Gregorian 2026-03-21).
        string FormatYear(DateOnly gregorian);

        // Parse a native-calendar year string back to a Gregorian date
        // (returns the first day of that year in the native calendar).
        DateOnly ParseYear(string native);

        // The Gregorian date on which the academic year begins for the given
        // Gregorian year. Solar Hijri schools start around Hamal 1 (~March 21);
        // Gregorian-country schools typically start September 1.
        DateOnly StartOfAcademicYear(int gregorianYear);

        // First day of the workweek in this country/calendar. Solar Hijri
        // countries typically use Saturday; Gregorian typically Monday.
        // Uses System.DayOfWeek (not digitalmaktabapi.Models.DayOfWeek —
        // the latter is a scheduling enum with SATURDAY at ordinal 0).
        System.DayOfWeek FirstDayOfWeek { get; }
    }
}
