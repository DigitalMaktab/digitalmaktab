import { Base } from "./Base";
import { City } from "./City";

export interface Country extends Base {
  countryName: string;
  countryCode: string;
  countryPhoneCode: string;
  cities: City[];
}
