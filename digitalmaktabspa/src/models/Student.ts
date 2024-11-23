import { Base } from "./Base";
import { Gender } from "./Gender";
import { UserRole } from "./UserRole";

export interface Student extends Base {
  userRole: UserRole;
  firstNameNative: string;
  lastNameNative: string;
  fatherNameNative: string;
  grandFatherNameNative: string;
  firstNameEnglish: string;
  lastNameEnglish: string;
  fatherNameEnglish: string;
  grandFatherNameEnglish: string;
  asasNumber: number;

  gender: Gender;
  genderValue: string;
}
