import React, { useState, useEffect } from "react";
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchedUser = getUser();
    if (
      fetchedUser &&
      typeof fetchedUser === "object" &&
      "role" in fetchedUser
    ) {
      setUser(fetchedUser as User);
    } else {
      setUser(null);
    }
  }, []);

  const roleMap: Record<UserRole, string> = {
    [UserRole.ADMIN]: t("userRole.admin"),
    [UserRole.PRINCIPAL]: t("userRole.principal"),
    [UserRole.HEAD_MASTER]: t("userRole.headMaster"),
    [UserRole.STUDENT]: t("userRole.student"),
    [UserRole.ROOT_USER]: t("userRole.rootUser"),
    [UserRole.TEACHER]: t("userRole.teacher"),
    [UserRole.UNKNOWN]: t("userRole.unknown"),
    // Add other mappings as needed
  };

  const renderUserProfile = () => {
    if (!user) {
      return (
        <AppImg
          className="img-50 rounded-circle"
          alt={t("userRole.unknown")}
          src="../assets/images/profile.png"
        />
      );
    }

    if (user.school) {
      return (
        <AppImg
          className="img-50 rounded-circle"
          alt={user.school.schoolName}
          src={`http://0.0.0.0:5000/${user.school.logo}`}
        />
      );
    }

    return (
      <AppImg
        className="img-50 rounded-circle"
        alt={t("userRole.unknown")}
        src="../assets/images/profile.png"
      />
    );
  };

  const getUserName = () => {
    if (user?.school) {
      return user.school.schoolName;
    }
    if (user?.teacher) {
      return `${user.teacher.firstName} ${user.teacher.lastName}`;
    }
    if (user?.student) {
      return `${user.student.firstNameNative} ${user.student.lastNameNative}`;
    }
    if (user?.rootUser) {
      return `${user.rootUser.firstName} ${user.rootUser.lastName}`;
    }
    return t("userRole.unknown");
  };

  const getUserRole = () => {
    if (user) {
      return roleMap[user!.role];
    }
    return t("userRole.unknown");
  };

  return (
    <li
      className={`custom-dropdown ${className}`}
      ref={(el) => {
        if (el) dropdownRefs.current[refIndex] = el;
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
        {renderUserProfile()}
        <div className="flex-grow-1">
          <h5>{getUserName()}</h5>
          <span>{getUserRole()}</span>
        </div>
      </div>
      <div className={`custom-menu overflow-hidden ${isOpen ? "show" : ""}`}>
        {children}
      </div>
    </li>
  );
};

export default React.memo(AppProfileDropdown);
