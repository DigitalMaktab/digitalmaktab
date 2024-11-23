import FeatherIcon from "feather-icons-react";
import React from "react";
import { MenuItemProps } from "../properties/MenuItemProps";
import AppSubMenuItem from "./AppSubMenuItem";
import { Link } from "react-router-dom";

const AppMenuItem: React.FC<MenuItemProps> = React.memo(
  ({
    label,
    icon,
    badge,
    subMenu,
    isActive,
    onMenuClick,
    onSubMenuClick,
    activeSubMenu,
    link,
  }) => (
    <li className={`sidebar-list ${isActive ? "active" : ""}`}>
      {subMenu && subMenu.length > 0 ? (
        <Link
          className="sidebar-link"
          to="#"
          onClick={onMenuClick}
          data-testid={`${label}-link`}
        >
          {icon}
          <span>{label}</span>
          {badge && (
            <div className="badge badge-primary rounded-pill">{badge}</div>
          )}
          <FeatherIcon icon="chevron-right" className="feather" />
        </Link>
      ) : (
        <Link className="sidebar-link" to={link || "#"}>
          {icon}
          <span>{label}</span>
          {badge && (
            <div className="badge badge-primary rounded-pill">{badge}</div>
          )}
        </Link>
      )}

      {subMenu && isActive && (
        <AppSubMenuItem
          subMenu={subMenu}
          activeSubMenu={activeSubMenu}
          onSubMenuClick={onSubMenuClick}
        />
      )}
    </li>
  )
);

export default AppMenuItem;
