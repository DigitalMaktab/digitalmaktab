import React from "react";
import { ButtonProperties } from "./properties/ButtonProperties";
import FeatherIcon from "feather-icons-react";

const AppButton: React.FC<ButtonProperties> = ({
  label,
  type,
  onButtonClick,
  icon,
  iconSize = 100,
  disabled,
  className,
  ...rest
}) => {
  return (
    <button
      {...rest}
      className={`btn btn-primary ${className}`}
      disabled={disabled}
      type={type}
      onClick={onButtonClick}
    >
      {icon && <FeatherIcon icon={icon} size={iconSize} />} {label}
    </button>
  );
};

export default AppButton;
