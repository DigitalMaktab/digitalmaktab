import { Base } from "./Base";
import { Class } from "./Class";
import { Subject } from "./Subject";

export interface ClassSubject extends Base {
  classId: string;
  class: Class;
  subjectId: string;
  subject: Subject;
}
