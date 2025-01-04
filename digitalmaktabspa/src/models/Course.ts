import { CourseSection } from "./CourseSection";
import { Base } from "./Base";
import { Class } from "./Class";
import { Subject } from "./Subject";
import { Teacher } from "./Teacher";

export interface Course extends Base {
  classId: string;
  class: Class;
  subjectId: string;
  subject: Subject;
  teacherId: string;
  teacher: Teacher;
  courseSections: CourseSection[];
}
