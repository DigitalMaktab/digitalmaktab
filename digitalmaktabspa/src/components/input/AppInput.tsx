import React, { useState } from "react";
import { InputProps, PhoneNumberValue } from "../properties/InputProps";
import AppFileInput from "./AppFileInput";
import AppPasswordInput from "./AppPasswordInput";
import AppPhoneNumberInput from "./AppPhoneNumberInput";

const AppInput: React.FC<
  InputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  required = false,
  setFieldValue,
  ...rest
}) => {
  const [phoneInput, setPhoneInput] = useState({
    countryId: "",
    number: "",
  });

  // Handle phone number input changes
  const handlePhoneNumberChange = (
    newValue: PhoneNumberValue = { countryId: "", number: "" }
  ) => {
    setPhoneInput(newValue); // Update local state for display
    // Use Formik's setFieldValue to set the composite value
    if (setFieldValue) {
      setFieldValue("phoneNumber", newValue); // Update the form field with both countryId and phoneNumber
    }
  };

  if (type === "file") {
    return <AppFileInput name={name} label={label} rest={rest} />;
  } else if (type === "password") {
    return (
      <AppPasswordInput
        name={name}
        label={label}
        required={required}
        placeholder={placeholder}
        value={value}
        rest={rest}
      />
    );
  } else if (type === "phoneNumber") {
    return (
      <AppPhoneNumberInput
        onChange={handlePhoneNumberChange}
        name={name}
        label={label}
        required={required}
        placeholder={placeholder}
        phonenumbervalue={phoneInput}
        countryIdName="phoneNumber.countryId"
      />
    );
  }

  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label} {required && "*"}
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
