import React from "react";
import { DropdownItemProps } from "./properties/DropdownItemProps";

const AppProfileDropdown: React.FC<DropdownItemProps> = ({
  dropdownKey,
  refIndex,
  isOpen,
  toggleDropdown,
  dropdownRefs,
  children,
  className,
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
        className="d-flex align-items-center"
        onClick={(e) => {
          e.preventDefault();
          toggleDropdown(dropdownKey);
        }}
      >
        <img src="../assets/images/profile.png" alt="" />
        <div className="flex-grow-1">
          <h5>Wade Warren</h5>
          <span>UI Designer</span>
        </div>
      </div>
      <div className={`custom-menu overflow-hidden ${isOpen ? "show" : ""}`}>
        {children}
      </div>
    </li>
  );
};

export default React.memo(AppProfileDropdown);
