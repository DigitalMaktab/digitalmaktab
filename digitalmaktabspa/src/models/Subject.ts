import { Base } from "./Base";
import { Book } from "./Book";
import { Course } from "./Course";

export interface Subject extends Base {
  subjectName: string;
  bookId: string;
  book: Book;
  courses: Course[];
}
