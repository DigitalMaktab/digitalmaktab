import React, { useState } from "react";
import { AppSideBarProps } from "./properties/ToggleSideBarProps";

import AppMenuMainTitle from "./menu/AppMenuMainTitle";
import AppMenuItem from "./menu/AppMenuItem";
import FeatherIcon from "feather-icons-react";
import * as AIIcons from "react-icons/ai";
import { MenuSection } from "./properties/MenuItemProps";

const AppSideBar: React.FC<AppSideBarProps> = ({ isOpen }) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeSubMenuItem, setActiveSubMenuItem] = useState<string | null>(
    null
  );

  const handleMenuClick = (label: string) => {
    setActiveItem((prev) => (prev === label ? null : label));
  };

  const handleSubMenuClick = (label: string) => {
    setActiveSubMenuItem((prev) => (prev === label ? null : label));
  };

  const menuItems: MenuSection[] = [
    {
      title: "General",
      items: [
        {
          label: "Dashboard",
          icon: <AIIcons.AiOutlineHome className="stroke-icon" />,
          link: "/admin-dashboard",
        },
        {
          label: "Widgets",
          icon: <AIIcons.AiOutlineWindows className="stroke-icon" />,
          badge: "40",
          subMenu: [
            { label: "General", link: "general-widget.html" },
            { label: "Chart", link: "chart-widget.html" },
          ],
        },
      ],
    },
    {
      title: "Applications",
      items: [
        {
          label: "Project",
          icon: <AIIcons.AiOutlineProject className="stroke-icon" />,
          subMenu: [
            { label: "Project List", link: "project-list.html" },
            { label: "Create New", link: "projectcreate.html" },
          ],
        },
      ],
    },
  ];
  return (
    <>
      <div className="overlay" aria-hidden={!isOpen}></div>
      <aside
        className={`sidebar ${!isOpen ? "sidebar-close" : ""} page-sidebar`}
        aria-hidden={!isOpen}
        data-sidebar-layout="stroke-svg"
      >
        <div className="left-arrow" id="left-arrow">
          <FeatherIcon icon="chevron-left" />
        </div>
        <div id="sidebar-menu">
          <ul className="sidebar-menu" id="simple-bar">
            <li className="pin-title sidebar-list p-0">
              <h5 className="sidebar-main-title">Pinned</h5>
            </li>
            <li className="line pin-line"></li>
            {menuItems.map((menuSection) => (
              <React.Fragment key={menuSection.title}>
                <AppMenuMainTitle title={menuSection.title} />
                {menuSection.items.map((item) => (
                  <AppMenuItem
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    badge={item.badge}
                    subMenu={item.subMenu}
                    isActive={activeItem === item.label}
                    onMenuClick={() => handleMenuClick(item.label)}
                    onSubMenuClick={handleSubMenuClick}
                    activeSubMenu={activeSubMenuItem}
                  />
                ))}
                <li className="line"></li>
              </React.Fragment>
            ))}
          </ul>
        </div>
        <div className="right-arrow" id="right-arrow">
          <FeatherIcon icon="arrow-right" />
        </div>
      </aside>
    </>
  );
};

export default AppSideBar;
