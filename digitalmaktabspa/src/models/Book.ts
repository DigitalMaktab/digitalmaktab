import { School } from "./School";
import { Subject } from "./Subject";

export interface Book {
  schoolId?: string;
  school?: School;
  bookTitle: string;
  subjectId: string;
  subject: Subject;
}
