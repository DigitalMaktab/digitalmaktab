import React, { useState } from "react";
import { PasswordInputProps } from "../properties/InputProps";
import { useTranslation } from "react-i18next";

const AppPasswordInput: React.FC<PasswordInputProps> = ({
  name,
  label,
  placeholder,
  value,
  required = true,
  rest,
}) => {
  const { t } = useTranslation();
  const [isPasswordVisible, setPasswordVisibility] = useState<boolean>(false);

  const togglePasswordVisibility = () => {
    setPasswordVisibility((prev) => !prev);
  };
  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label} {required && "*"}
      </label>
      <div className="form-input position-relative">
        <input
          className="form-control"
          id={name}
          type={isPasswordVisible ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          defaultValue={value}
          {...rest}
        />
        <div className="show-hide" onClick={togglePasswordVisibility}>
          <span className={isPasswordVisible ? "" : "show"}>
            {isPasswordVisible
              ? t("controls.passwordInput.hide")
              : t("controls.passwordInput.show")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppPasswordInput;
