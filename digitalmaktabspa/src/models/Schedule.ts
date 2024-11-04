import { ScheduleTime } from "./ScheduleTime";
import { ClassSubject } from "./ClassSubject";
import { DayOfWeek } from "./DayOfWeek";
import { Teacher } from "./Teacher";

export interface Schedule {
  classSubjectId: string;
  classSubject: ClassSubject;
  teacherId: string;
  teacher: Teacher;
  dayOfWeekValue: string;
  dayOfWeek: DayOfWeek;
  scheduleTime: ScheduleTime;
}
