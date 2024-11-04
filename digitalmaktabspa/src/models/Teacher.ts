import { Address } from "./Address";
import { Base } from "./Base";
import { Class } from "./Class";
import { Gender } from "./Gender";
import { PhoneNumber } from "./PhoneNumber";
import { Schedule } from "./Schedule";
import { School } from "./School";
import { UserRole } from "./UserRole";

export interface Teacher extends Base {
  userRole: UserRole;

  firstName: string;
  lastName: string;

  gender: Gender;
  genderValue: string;

  schoolId: string;
  school: School;

  classes: Class[];

  primaryAddress: Address;

  phoneNumber: PhoneNumber;
  email: string;

  schedules: Schedule[];
}
