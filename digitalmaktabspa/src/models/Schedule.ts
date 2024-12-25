import { ScheduleTime } from "./ScheduleTime";
import { Course } from "./Course";
import { DayOfWeek } from "./DayOfWeek";
import { Teacher } from "./Teacher";

export interface Schedule {
  courseId: string;
  course: Course;
  teacherId: string;
  teacher: Teacher;
  dayOfWeekValue: string;
  dayOfWeek: DayOfWeek;
  scheduleTime: ScheduleTime;
}
