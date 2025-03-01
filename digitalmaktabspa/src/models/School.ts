import { AddAddressDto } from "../dtos/AddAddressDto";
import { AddPhoneNumberDto } from "../dtos/AddPhoneNumberDto";
import { SchoolType } from "./SchoolType";
import { UserRole } from "./UserRole";

export interface School {
  userRole: UserRole;
  schoolName: string;
  address: AddAddressDto;
  phoneNumber: AddPhoneNumberDto;
  email: string;
  password: string;
  confirmPassword?: string;
  logo?: File | null;
  code: string;
  schoolType: SchoolType;
  schoolTypeValue: string;
}
