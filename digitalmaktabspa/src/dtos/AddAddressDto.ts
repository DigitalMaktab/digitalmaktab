import { AddressType } from "../models/AddressType";

export interface AddAddressDto {
  street?: string;
  districtId?: string;
  village?: string;
  region?: string;
  postalCode?: string;
  addressType?: AddressType;
}
