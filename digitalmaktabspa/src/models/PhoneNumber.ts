import { Country } from "./Country";

export interface PhoneNumber {
  countryId: string;
  country: Country;
  number: string;
}
