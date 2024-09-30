import React from "react";
import { InputProps } from "../properties/InputProps";
import AppFileInput from "./AppFileInput";
import AppPasswordInput from "./AppPasswordInput";

const AppInput: React.FC<
  InputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({ label, name, type = "text", placeholder, value, ...rest }) => {
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
