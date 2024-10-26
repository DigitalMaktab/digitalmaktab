import { AddAddressDto } from "./AddAddressDto";
import { AddPhoneNumberDto } from "./AddPhoneNumberDto";

export interface SchoolForAddDto {
  schoolName: string;
  address: AddAddressDto;
  phoneNumber: AddPhoneNumberDto;
  email: string;
  password: string;
  confirmPassword?: string;
  logo?: File | null;
  code: string;
}
