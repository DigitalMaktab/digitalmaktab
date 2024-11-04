import React, { useState } from "react";
import { DropdownItemProps } from "./properties/DropdownItemProps";
import { useTranslation } from "react-i18next";
import { User } from "../models/User";
import { getUser } from "../helper/helper";
import AppImg from "./AppImg";
import { UserRole } from "../models/UserRole";

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
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(getUser());

  const roleMap = {
    [UserRole.ADMIN]: "admin",
    [UserRole.PRINCIPAL]: "principal",
    [UserRole.HEAD_MASTER]: "head_master",
    // Add other mappings as needed
  };
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
        {user && user.school && user.school.logo && (
          <AppImg
            className="img-50 rounded-circle"
            alt={user.school.schoolName}
            src={`http://0.0.0.0:5000/${user.school.logo}`}
          />
        )}

        {!user && (
          <AppImg
            className="img-50 rounded-circle"
            alt=""
            src="../assets/images/profile.png"
          />
        )}

        <img alt="" />
        <div className="flex-grow-1">
          <h5>{user && user.school && user?.school.schoolName}</h5>
          <span>
            {user &&
              t(
                `userRole.${
                  user && user.school && UserRole[user.school.userRole]
                }`
              )}
          </span>
        </div>
      </div>
      <div className={`custom-menu overflow-hidden ${isOpen ? "show" : ""}`}>
        {children}
      </div>
    </li>
  );
};

export default React.memo(AppProfileDropdown);
