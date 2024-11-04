import React, { useContext, useState } from "react";
import { AppSideBarProps } from "./properties/ToggleSideBarProps";

import AppMenuMainTitle from "./menu/AppMenuMainTitle";
import AppMenuItem from "./menu/AppMenuItem";
import FeatherIcon from "feather-icons-react";
import * as AIIcons from "react-icons/ai";
import * as PIIcons from "react-icons/pi";
import * as LiaIcons from "react-icons/lia";
import * as SIIcons from "react-icons/si";
import { MenuSection } from "./properties/MenuItemProps";
import { useTranslation } from "react-i18next";
import { UserRole } from "../models/UserRole";
import { AuthContext } from "../helper/auth/AuthProvider";

const AppSideBar: React.FC<AppSideBarProps> = ({ isOpen }) => {
  const { t } = useTranslation();
  const { userRole } = useContext(AuthContext);
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

  const allMenuItems: MenuSection[] = [
    {
      title: t("sidebar.general.label"),
      items: [
        {
          label: t("sidebar.general.menues.dashboard"),
          icon: <AIIcons.AiOutlineHome className="stroke-icon" />,
          link: "/home",
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
        {
          label: t("sidebar.general.menues.library.label"),
          icon: <AIIcons.AiOutlineBook className="stroke-icon" />,
          subMenu: [
            {
              label: t("sidebar.general.menues.library.onlineLibrary"),
              link: "/online-library",
            },
            {
              label: t("sidebar.general.menues.library.list"),
              link: "/library",
            },
            {
              label: t("sidebar.general.menues.library.add"),
              link: "/add-book",
            },
          ],
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
        {
          label: t("sidebar.general.menues.classes.label"),
          icon: <SIIcons.SiGoogleclassroom className="stroke-icon" />,
          subMenu: [
            {
              label: t("sidebar.general.menues.branches.list"),
              link: "/branch-list",
            },
            {
              label: t("sidebar.general.menues.branches.add"),
              link: "/branch-editor/new",
            },
            {
              label: t("sidebar.general.menues.classes.list"),
              link: "/class-list",
            },
            {
              label: t("sidebar.general.menues.classes.add"),
              link: "/class-editor/new",
            },
          ],
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
        {
          label: t("sidebar.general.menues.timeTable.label"),
          icon: <AIIcons.AiOutlineSchedule className="stroke-icon" />,
          subMenu: [
            {
              label: t("sidebar.general.menues.timeTable.list"),
              link: "/timetable",
            },
            {
              label: t("sidebar.general.menues.timeTable.add"),
              link: "/add-timetable",
            },
          ],
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
      ],
    },
    {
      title: t("sidebar.teachers.label"),
      items: [
        {
          label: t("sidebar.teachers.menues.list"),
          icon: <LiaIcons.LiaChalkboardTeacherSolid className="stroke-icon" />,
          link: "/teacher-list",
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
        {
          label: t("sidebar.teachers.menues.register"),
          icon: <AIIcons.AiOutlineUserAdd className="stroke-icon" />,
          link: "/teacher-editor/new",
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
      ],
    },
    {
      title: t("sidebar.students.label"),
      items: [
        {
          label: t("sidebar.students.menues.list"),
          icon: <PIIcons.PiStudent className="stroke-icon" />,
          link: "/student-list",
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
        {
          label: t("sidebar.students.menues.register"),
          icon: <AIIcons.AiOutlineUserAdd className="stroke-icon" />,
          link: "/student-editor/new",
          roles: [UserRole.ADMIN, UserRole.ROOT_USER],
        },
      ],
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles?.includes(userRole!)),
    }))
    .filter((section) => section.items.length > 0);

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
                    link={item.link}
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
