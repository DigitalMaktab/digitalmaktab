import { Base } from "./Base";
import { Branch } from "./Branch";
import { CalendarYear } from "./CalendarYear";
import { ClassName } from "./ClassName";
import { ClassType } from "./ClassType";
import { Enrollment } from "./Enrollment";
import { School } from "./School";
import { Shift } from "./Shift";
import { Teacher } from "./Teacher";

export interface Class extends Base {
  school: School;
  className: ClassName;
  classNameValue: string;
  branchId: string;
  branch: Branch;
  classTypeValue: string;
  classType: ClassType;
  shift: Shift;
  shiftValue: string;
  teacher: Teacher;
  calendarYear: CalendarYear;
  enrollments: Enrollment[];
}
