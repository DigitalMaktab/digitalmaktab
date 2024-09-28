import React from "react";
import { DropdownItemProps } from "../properties/DropdownItemProps";
import FeatherIcon from "feather-icons-react";

const AppDropdownItem: React.FC<DropdownItemProps> = ({
  dropdownKey,
  icon,
  badge,
  refIndex,
  isOpen,
  toggleDropdown,
  dropdownRefs,
  children,
  className,
  badgeClassName,
  style,
}) => {
  return (
    <li
      className={`custom-dropdown ${className}`}
      ref={(el) => {
        dropdownRefs.current[refIndex] = el;
      }}
      style={{ ...style }}
    >
      <div
        onClick={(e) => {
          e.preventDefault();
          toggleDropdown(dropdownKey);
        }}
      >
        <FeatherIcon icon={icon} className={badgeClassName} />
        {badge && (
          <span className="badge rounded-pill badge-secondary">{badge}</span>
        )}
      </div>
      <div className={`custom-menu ${isOpen ? "show" : ""}`}>{children}</div>
    </li>
  );
};

export default React.memo(AppDropdownItem);
