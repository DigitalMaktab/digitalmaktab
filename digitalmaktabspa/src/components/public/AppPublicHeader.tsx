import React, { useRef } from "react";
import { Link } from "react-router-dom";
import AppImg from "../AppImg";
import { useTranslation } from "react-i18next";
import AppDropdownItem from "../dropdown/AppDropdownItem";
import { useDropdowns } from "../../hooks/useDropdown";
import AppLocalizer from "../dropdown/AppLocalizer";
import FeatherIcon from "feather-icons-react";

const AppPublicHeader = () => {
  const { dropdownState, toggleDropdown, dropdownRefs } = useDropdowns();
  const { t } = useTranslation();
  const menuRef = useRef<HTMLUListElement | null>(null);
  const handleToggleMenu = () => {
    if (menuRef.current) {
      menuRef.current.classList.toggle("open");
    }
  };
  return (
    <header className="landing-header">
      <div className="container-fluid fluid-space">
        <div className="row">
          <div className="col-12">
            <nav className="navbar navbar-light p-0" id="navbar-example2">
              <Link className="navbar-brand" to="/">
                <AppImg
                  className="for-light"
                  style={{ width: 130, height: 80 }}
                  src={`${process.env.PUBLIC_URL}/assets/images/logo/logo-no-background-dark.svg`}
                />
              </Link>
              <ul className="landing-menu nav nav-pills" ref={menuRef}>
                <li className="nav-item menu-back" onClick={handleToggleMenu}>
                  {t("public.header.back")} <FeatherIcon icon="chevron-right" />
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#home">
                    <FeatherIcon icon="home" /> {t("public.header.home.label")}
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#feature">
                    <FeatherIcon icon="shopping-bag" />{" "}
                    {t("public.header.features.label")}
                  </a>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/signup">
                    <FeatherIcon icon="user-plus" />{" "}
                    {t("auth.login.createAccount")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    <FeatherIcon icon="user" /> {t("auth.login.login")}
                  </Link>
                </li>
                <AppDropdownItem
                  key="language"
                  dropdownKey="language"
                  icon="globe"
                  refIndex={0}
                  isOpen={dropdownState["language"] || false}
                  toggleDropdown={toggleDropdown}
                  dropdownRefs={dropdownRefs}
                  className="nav-item"
                  style={{ marginTop: 10, marginLeft: 20, marginRight: 20 }}
                >
                  {<AppLocalizer />}
                </AppDropdownItem>
              </ul>
              <div className="buy-block">
                <div className="toggle-menu" onClick={handleToggleMenu}>
                  <FeatherIcon icon="align-justify" />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppPublicHeader;
