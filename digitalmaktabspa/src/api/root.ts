import { CalendarYear } from "../models/CalendarYear";
import { Subject } from "../models/Subject";
import apiClient from "./client";

const addBook = (book: FormData) =>
  apiClient.post("/root/addBook", book, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const addCalendarYear = (calendarYear: CalendarYear) =>
  apiClient.post("/root/addCalendarYear", calendarYear);

const calendarYearList = () => apiClient.get("/root/calendarYears");

const addSubject = (calendarYear: Subject) =>
  apiClient.post("/root/addSubject", calendarYear);

const deleteSubject = (id: string) =>
  apiClient.delete(`/root/deleteSubject/${id}`);

const root = {
  addBook,
  addCalendarYear,
  calendarYearList,
  addSubject,
  deleteSubject,
};

export default root;
