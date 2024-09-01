import React from "react";
import { ButtonProperties } from "./properties/ButtonProperties";

const AppButton: React.FC<ButtonProperties> = ({
  label,
  type,
  onButtonClick,
  icon,
  disabled,
}) => {
  return (
    <div className="text-end mt-3">
      <button
        className="btn btn-primary btn-block w-100 text-white"
        disabled={disabled}
        type={type}
        onClick={onButtonClick}
      >
        <i aria-hidden="true" className={icon}></i>
        {label}
      </button>
    </div>
  );
};

export default AppButton;
