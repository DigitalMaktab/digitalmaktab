import React from "react";
import { ButtonProperties } from "./properties/ButtonProperties";
import FeatherIcon from "feather-icons-react";

const AppButton: React.FC<ButtonProperties> = ({
  label,
  type,
  onButtonClick,
  icon,
  disabled,
  className,
}) => {
  return (
    <button
      className={`btn btn-primary ${className}`}
      disabled={disabled}
      type={type}
      onClick={onButtonClick}
    >
      {icon && <FeatherIcon icon={icon} />} {label}
    </button>
  );
};

export default AppButton;
