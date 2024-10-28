import { AddAddressDto } from "./AddAddressDto";
import { AddPhoneNumberDto } from "./AddPhoneNumberDto";

export interface SchoolForUpdateDto {
  schoolName: string;
  address: AddAddressDto;
  phoneNumber: AddPhoneNumberDto;
  logo?: File | null;
  code: string;
}
