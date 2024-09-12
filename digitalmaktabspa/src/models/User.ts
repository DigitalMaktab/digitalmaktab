// TODO: Change the user object to usertype(RootUser, School, Teacher, Student)

import { RootUser } from "./RootUser";
import { School } from "./School";
import { Student } from "./Student";
import { Teacher } from "./Teacher";

export interface User {
  token: string;
  user: Student | School | Teacher | RootUser;
}
