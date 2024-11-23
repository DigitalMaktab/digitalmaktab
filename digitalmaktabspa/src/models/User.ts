import { RootUser } from "./RootUser";
import { School } from "./School";
import { Student } from "./Student";
import { Teacher } from "./Teacher";
import { UserRole } from "./UserRole";

export interface User {
  token: string;
  school: School;
  teacher: Teacher;
  student: Student;
  rootUser: RootUser;
  role: UserRole;
}
