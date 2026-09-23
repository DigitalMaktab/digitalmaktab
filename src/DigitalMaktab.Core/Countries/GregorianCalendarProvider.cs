using digitalmaktabapi.Models;
using DigitalMaktab.Core.Abstractions.Countries;

namespace digitalmaktabapi.Countries
{
    // Default fallback for countries that use the Gregorian calendar
    // (US, UK, most EU, most of the world). Lives in Core so any country
    // without its own module gets it for free.
    public class GregorianCalendarProvider : ICalendarProvider
    {
        public CalendarSystem System => CalendarSystem.GREGORIAN;

        public global::System.DayOfWeek FirstDayOfWeek => global::System.DayOfWeek.Monday;

        public string FormatYear(DateOnly gregorian) => gregorian.Year.ToString();

        public DateOnly ParseYear(string native)
        {
            if (!int.TryParse(native, out var year))
                throw new FormatException($"'{native}' is not a valid Gregorian year.");
            return new DateOnly(year, 1, 1);
        }

        // Typical Northern Hemisphere academic year — September 1. Countries
        // that start earlier or later (Australia in January, some in June)
        // would ship their own provider or override in their module.
        public DateOnly StartOfAcademicYear(int gregorianYear) => new(gregorianYear, 9, 1);
    }
}
