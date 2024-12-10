import { Base } from "./Base";
import { Book } from "./Book";
import { ClassSubject } from "./ClassSubject";

export interface Subject extends Base {
  subjectName: string;
  bookId: string;
  book: Book;
  classSubjects: ClassSubject[];
}
