import { Base } from "./Base";
import { CalendarYear } from "./CalendarYear";
import { Class } from "./Class";
import { Student } from "./Student";

export interface Enrollment extends Base {
  studentId: string;
  student: Student;
  classId: string;
  class: Class;
  calendarYearId: string;
  calendarYear: CalendarYear;
}
