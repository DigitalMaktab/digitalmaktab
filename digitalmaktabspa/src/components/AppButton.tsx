import React from "react";
import { ButtonProperties } from "./properties/ButtonProperties";

const AppButton: React.FC<ButtonProperties> = ({
  label,
  type,
  onButtonClick,
  icon,
  disabled,
  className,
}) => {
  return (
    <>
      <button
        className={`btn btn-primary btn-block ${className}`}
        disabled={disabled}
        type={type}
        onClick={onButtonClick}
      >
        <i aria-hidden="true" className={icon}></i>
        {label}
      </button>
    </>
  );
};

export default AppButton;
