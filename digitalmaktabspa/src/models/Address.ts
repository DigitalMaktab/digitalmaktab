import { AddressType } from "./AddressType";

export interface Address {
  street?: string;
  districtId?: string;
  village?: string;
  region?: string;
  postalCode?: string;
  addressType: AddressType;
}
