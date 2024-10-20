import { Base } from "./Base";
import { Country } from "./Country";

export interface City extends Base {
  stateCode: string;
  stateName: string;
  countryId: string;
  country: Country;
}
