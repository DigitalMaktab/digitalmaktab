import { Class } from "./Class";
import { Subject } from "./Subject";

export interface ClassSubject {
  classId: string;
  class: Class;
  subjectId: string;
  subject: Subject;
}
