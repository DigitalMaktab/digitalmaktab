import { Base } from "./Base";
import { Gender } from "./Gender";
import { UserRole } from "./UserRole";

export interface Teacher extends Base {
  userRole: UserRole;
  firstName: string;
  lastName: string;
  genderValue: string;
  gender: Gender;
}
