import React, { useState } from "react";
import { InputProps, PhoneNumberValue } from "../properties/InputProps";
import AppFileInput from "./AppFileInput";
import AppPasswordInput from "./AppPasswordInput";
import AppPhoneNumberInput from "./AppPhoneNumberInput";

const AppInput: React.FC<
  InputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({ label, name, type = "text", placeholder, value, ...rest }) => {
  const [phoneInput, setPhoneInput] = useState({
    countryCode: "", // Default country code, adjust as needed
    phoneNumber: "", // Default phone number
  });

  const handleInputChange = (
    newValue: PhoneNumberValue = {
      countryCode: "",
      phoneNumber: "",
    }
  ) => {
    setPhoneInput(newValue); // Update the state with the new values
  };

  if (type === "file") {
    return <AppFileInput name={name} label={label} rest={rest} />;
  } else if (type === "password") {
    return (
      <AppPasswordInput
        name={name}
        label={label}
        placeholder={placeholder}
        value={value}
        rest={rest}
      />
    );
  } else if (type === "phoneNumber") {
    return (
      <AppPhoneNumberInput
        onChange={handleInputChange}
        name={name}
        label={label}
        placeholder={placeholder}
        phonenumbervalue={phoneInput}
        countryCodeName="countryId"
      />
    );
  }

  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label}
      </label>
      <input
        className="form-control"
        id={name}
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={value}
        {...rest}
      />
    </div>
  );
};

export default AppInput;
