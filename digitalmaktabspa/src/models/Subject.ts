import { Book } from "./Book";
import { ClassSubject } from "./ClassSubject";

export interface Subject {
  subjectName: string;
  bookId: string;
  book: Book;
  classSubjects: ClassSubject[];
}
