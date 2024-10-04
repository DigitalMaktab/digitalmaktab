import React, { useMemo } from "react";
import FeatherIcon from "feather-icons-react";
import AppImg from "./AppImg";
import { AppHeaderProps } from "./properties/ToggleSideBarProps";
import { useDropdowns } from "../hooks/useDropdown";
import AppDropdownItem from "./dropdown/AppDropdownItem";
import AppProfileDropdown from "./AppProfileDropdown";
import { DropDownItem } from "../helper/object/DropDownItem";
import AppLocalizer from "./dropdown/AppLocalizer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AppHeader: React.FC<AppHeaderProps> = ({ onSidebarToggle }) => {
  const { t } = useTranslation();
  const { dropdownState, toggleDropdown, dropdownRefs } = useDropdowns();

  const dropdownItems: DropDownItem[] = useMemo(
    () => [
      {
        key: "language",
        icon: "globe",
        content: <AppLocalizer />,
      },
      {
        key: "profile",
        icon: "profile",
        badge: "3",
        content: (
          <ul>
            <li className="d-flex">
              <FeatherIcon icon="home" />
              <Link className="ms-2" to="/user-profile">
                {t("header.user.actions.account")}
              </Link>
            </li>
            <li className="d-flex">
              <FeatherIcon icon="lock" />
              <Link className="ms-2" to="/logout">
                {t("header.user.actions.logout")}
              </Link>
            </li>
          </ul>
        ),
      },
    ],
    []
  );

  return (
    <header className="page-header row">
      <div className="logo-wrapper d-flex align-items-center col-auto">
        <Link to="/admin-dashboard">
          <AppImg
            className="for-light"
            style={{ width: 130, height: 55 }}
            src={`${process.env.PUBLIC_URL}/assets/images/logo/logo-no-background-dark.svg`}
          />
          <AppImg
            className="for-dark"
            style={{ width: 130, height: 55 }}
            src={`${process.env.PUBLIC_URL}/assets/images/logo/logo-no-background.svg`}
          />
        </Link>
        <a
          className="close-btn"
          href="/admin-dashboard"
          onClick={(e) => {
            e.preventDefault();
            onSidebarToggle();
          }}
        >
          <div className="toggle-sidebar">
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
          </div>
        </a>
      </div>
      <div className="page-main-header col">
        <div className="header-left d-lg-block d-none">
          <form className="search-form mb-0">
            <div className="input-group">
              <span className="input-group-text pe-0">
                <FeatherIcon icon="search" className="svg-color" />
              </span>
              <input
                className="form-control"
                type="text"
                placeholder={t("header.search.placeholder")}
              />
            </div>
          </form>
        </div>
        <div className="nav-right">
          <ul className="header-right">
            {dropdownItems.map((item, index) =>
              item.key === "profile" ? (
                <AppProfileDropdown
                  key={item.key}
                  dropdownKey={item.key}
                  icon={item.icon}
                  badge={item.badge}
                  refIndex={index}
                  isOpen={dropdownState[item.key] || false}
                  toggleDropdown={toggleDropdown}
                  dropdownRefs={dropdownRefs}
                  className="profile-dropdown"
                >
                  {item.content}
                </AppProfileDropdown>
              ) : (
                <AppDropdownItem
                  key={item.key}
                  dropdownKey={item.key}
                  icon={item.icon}
                  badge={item.badge}
                  refIndex={index}
                  isOpen={dropdownState[item.key] || false}
                  toggleDropdown={toggleDropdown}
                  dropdownRefs={dropdownRefs}
                >
                  {item.content}
                </AppDropdownItem>
              )
            )}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
