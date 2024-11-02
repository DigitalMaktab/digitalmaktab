import React, { useMemo } from "react";
import { PhoneNumberInputProps } from "../properties/InputProps";
import AppSelect2 from "./AppSelect2";
import useCountries from "../../hooks/useCountries";
import { useTranslation } from "react-i18next";
import AppCountrySelect from "../select/AppCountrySelect";

const AppPhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  onChange,
  value,
  label,
  name,
  phonenumbervalue,
  countryIdName,
  required = false,
  ...rest
}) => {
  const { t } = useTranslation();

  // Handle phone number input change
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value.replace(/\D/g, "");

    onChange({
      countryId: phonenumbervalue.countryId, // Keep the existing countryId
      number: newPhoneNumber, // Update the phone number directly
    });
  };

  // Handle country code change
  const handleCountryChange = (newCountryId: string) => {
    onChange({
      countryId: newCountryId, // Update the countryId directly
      number: phonenumbervalue.number, // Keep the existing number
    });
  };

  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label} {required && "*"}
      </label>
      <div
        className="d-flex"
        style={{ width: "100%", height: "calc(2.25rem + 2px)" }}
      >
        <AppCountrySelect
          name={countryIdName}
          showSelect2Lable={false}
          value={phonenumbervalue.countryId}
          onChange={handleCountryChange}
          required={required}
        />
        <input
          name={name}
          type="text"
          className="form-control"
          style={{ width: "200%" }}
          value={phonenumbervalue.number || ""}
          onChange={handlePhoneNumberChange}
          {...rest}
          inputMode="numeric" // Show numeric keyboard on mobile devices
          pattern="[0-9]*"
          maxLength={10}
        />
      </div>
    </div>
  );
};

export default AppPhoneNumberInput;
