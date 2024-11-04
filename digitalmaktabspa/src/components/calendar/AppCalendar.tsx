import React, { useState } from "react";
import Calendar, { CalendarProps } from "react-calendar";
import "react-calendar/dist/Calendar.css";

const AppCalendar: React.FC<{ locale: string; selectRange?: boolean }> = ({
  locale,
  selectRange = false,
}) => {
  const events = [
    { date: new Date(2024, 10, 10), title: "Meeting" }, // November 10, 2024
    { date: new Date(2024, 10, 15), title: "Conference" }, // November 15, 2024
    { date: new Date(2024, 10, 20), title: "Workshop" }, // November 20, 2024
  ];
  // Initialize date state as Date for single mode or [Date, Date] for range mode
  const [date, setDate] = useState<Date | [Date, Date]>(
    selectRange ? [new Date(), new Date()] : new Date()
  );

  // Define the handleDateChange function matching the expected CalendarProps['onChange']
  const handleDateChange: CalendarProps["onChange"] = (value) => {
    setDate(value as Date | [Date, Date]);
  };

  const highlightFridays: CalendarProps["tileClassName"] = ({ date, view }) => {
    if (view === "month" && date.getDay() === 5) {
      return "friday-off"; // Custom class only for Fridays
    }
    return null;
  };

  const renderEventContent: CalendarProps["tileContent"] = ({ date, view }) => {
    if (view === "month") {
      const event = events.find(
        (event) => event.date.toDateString() === date.toDateString()
      );
      return event ? <div className="event">{event.title}</div> : null;
    }
    return null;
  };

  return (
    <Calendar
      onChange={handleDateChange}
      value={date}
      locale={locale}
      selectRange={selectRange} // Controls whether range mode is enabled
      calendarType="islamic"
      tileClassName={highlightFridays}
      tileContent={renderEventContent}
    />
  );
};

export default AppCalendar;
