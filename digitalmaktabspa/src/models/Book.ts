import { Base } from "./Base";
import { School } from "./School";
import { Subject } from "./Subject";

export interface OpenLibrary {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryBook[];
  offset: number | null;
}

export interface OpenLibraryBook extends Base {
  title: string;
  author_name: string[];
  key: string;
  cover_i?: number;
  ia?: string[]; // Internet Archive ID
  text_url?: string; // URL for plain text (if available)
  epub_url?: string; // URL for ePUB (if available)
}

export interface Book extends OpenLibraryBook {
  schoolId?: string;
  school?: School;
  bookTitle: string;
  subjectId: string;
  subject: Subject;
}
