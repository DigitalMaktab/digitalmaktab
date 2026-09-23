using System.Globalization;
using digitalmaktabapi.Models;
using DigitalMaktab.Core.Abstractions.Countries;

namespace DigitalMaktab.Country.Afghanistan.Providers
{
    // Solar Hijri (Jalali) calendar via .NET's PersianCalendar. Used by Afghan
    // schools; matches the Gregorian mapping the app already displayed
    // (e.g. CalendarYear.NativeYear = "1405" for Gregorian 2026-03-21).
    public class SolarHijriCalendarProvider : ICalendarProvider
    {
        private static readonly PersianCalendar Persian = new();

        public CalendarSystem System => CalendarSystem.SOLAR_HIJRI;

        // Solar Hijri new year (Nowruz) falls on the vernal equinox —
        // Gregorian March 20 or 21 depending on the year.
        public global::System.DayOfWeek FirstDayOfWeek => global::System.DayOfWeek.Saturday;

        public string FormatYear(DateOnly gregorian)
        {
            var dt = gregorian.ToDateTime(TimeOnly.MinValue);
            return Persian.GetYear(dt).ToString();
        }

        public DateOnly ParseYear(string native)
        {
            if (!int.TryParse(native, out var solarYear))
                throw new FormatException($"'{native}' is not a valid Solar Hijri year.");
            // First day of Solar Hijri year = Hamal 1 in Persian calendar.
            var dt = Persian.ToDateTime(solarYear, 1, 1, 0, 0, 0, 0);
            return DateOnly.FromDateTime(dt);
        }

        public DateOnly StartOfAcademicYear(int gregorianYear)
        {
            // Afghan public schools start on Hamal 1 (~March 21) which is
            // also Solar Hijri New Year. The specific Gregorian date shifts
            // ±1 day year to year based on the vernal equinox.
            var solarYearForGregorian = Persian.GetYear(new DateTime(gregorianYear, 3, 21));
            var dt = Persian.ToDateTime(solarYearForGregorian, 1, 1, 0, 0, 0, 0);
            return DateOnly.FromDateTime(dt);
        }
    }
}
