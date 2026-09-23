namespace digitalmaktabapi.Models
{
    // Which calendar a country's schools use for their academic year, timetables, and reports.
    // Referenced by Country.CalendarSystem; drives ICalendarProvider resolution (see docs/globalization.md §4.7).
    public enum CalendarSystem
    {
        GREGORIAN,
        SOLAR_HIJRI,
        ISLAMIC
    }
}
