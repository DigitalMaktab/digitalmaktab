import React, { useMemo } from "react";
import { PhoneNumberInputProps } from "../properties/InputProps";
import AppSelect2 from "./AppSelect2";
import useCountries from "../../hooks/useCountries";
import { useTranslation } from "react-i18next";

const AppPhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  onChange,
  value,
  label,
  name,
  phonenumbervalue,
  countryCodeName,
  ...rest
}) => {
  const { t } = useTranslation();
  const { select2Countries, loading, error } = useCountries();
  const countryOptions = useMemo(() => {
    return select2Countries.map((item) => ({ id: item.id, text: item.text }));
  }, [select2Countries]);

  // Handle phone number input change
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value.replace(/\D/g, "");
    onChange({
      ...phonenumbervalue, // Keep the other values unchanged
      phoneNumber: newPhoneNumber,
    });
  };

  // Handle country code change
  const handleCountryChange = (newCountryCode: string) => {
    onChange({
      ...phonenumbervalue, // Keep the other values unchanged
      countryCode: newCountryCode,
    });
  };

  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label}
      </label>
      <div className="d-flex" style={{ width: "100%", height: "48px" }}>
        <AppSelect2
          name={countryCodeName}
          data={countryOptions}
          value={phonenumbervalue.countryCode}
          onChange={handleCountryChange}
          label={t("controls.select2.country.label")}
        />
        <input
          name={name}
          type="text"
          className="form-control"
          style={{ width: "200%" }}
          value={phonenumbervalue.phoneNumber || ""}
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
