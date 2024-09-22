import React from "react";
import { SubMenuProps } from "../properties/MenuItemProps";
import { Link } from "react-router-dom";
import { AiOutlineArrowRight } from "react-icons/ai";

const AppSubMenuItem: React.FC<SubMenuProps> = React.memo(
  ({ subMenu, activeSubMenu, onSubMenuClick }) => {
    return (
      <ul className={`sidebar-submenu`}>
        {subMenu.map((item) => (
          <li
            key={item.link}
            className={`submenu-item ${
              activeSubMenu === item.label ? "active" : ""
            }`}
          >
            <Link
              to={item.link}
              aria-label={item.label}
              onClick={() => onSubMenuClick(item.label)}
              aria-expanded={activeSubMenu === item.label}
            >
              <AiOutlineArrowRight className="svg-menu" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
);

export default AppSubMenuItem;
