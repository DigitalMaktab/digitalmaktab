import { School } from "./School";
import { Teacher } from "./Teacher";

export interface Class {
  school: School;
  className: string;
  classType: string;
  shift: string;
  teacher: Teacher;
}
