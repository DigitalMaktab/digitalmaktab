import { AddPhoneNumberDto } from "../dtos/AddPhoneNumberDto";
import { Address } from "./Address";
import { Base } from "./Base";
import { BloodGroup } from "./BloodGroup";
import { DisabilityType } from "./DisabilityType";
import { Gender } from "./Gender";
import { IsOrphan } from "./IsOrphan";
import { Language } from "./Language";
import { NationalId } from "./NationalId";
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
  dateOfBirth: string;
  joiningClassId: string;

  phoneNumber: AddPhoneNumberDto;

  primaryAddress: Address;
  secondaryAddress: Address;

  nationalId?: NationalId;

  brotherName?: string;
  fUncleName?: string;
  fCousinName?: string;
  mUncleName?: string;
  mCousinName?: string;

  bloodGroup?: BloodGroup;
  bloodGroupValue?: string;

  disabilityType: DisabilityType;
  disabilityTypeValue: string;

  isOrphan: IsOrphan;
  isOrphanValue: string;

  motherTongue: Language;
  motherTongueValue: string;

  email: string;
}
