import React from "react";
import { InputProps } from "./properties/InputProps";

const AppInput: React.FC<
  InputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({ label, name, type = "text", placeholder, value, ...rest }) => {
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
