import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppSideBarProps } from "./properties/ToggleSideBarProps";

import AppMenuMainTitle from "./menu/AppMenuMainTitle";
import AppMenuItem from "./menu/AppMenuItem";
import FeatherIcon from "feather-icons-react";
import * as AIIcons from "react-icons/ai";
import * as PIIcons from "react-icons/pi";
import * as LiaIcons from "react-icons/lia";
import * as SIIcons from "react-icons/si";
import * as BIIcons from "react-icons/bi";
import * as MDIcons from "react-icons/md";
import { MenuSection } from "./properties/MenuItemProps";
import { useTranslation } from "react-i18next";
import { UserRole } from "../models/UserRole";
import { AuthContext } from "../helper/auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";

const AppSideBar: React.FC<AppSideBarProps> = ({ isOpen }) => {
  const { t } = useTranslation();
  const { userRole } = useContext(AuthContext);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeSubMenuItem, setActiveSubMenuItem] = useState<string | null>(
    null
  );
  const [showVerticalMenu, setShowVerticalMenu] = useState(false);
  const { logout } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const toggleVerticalMenu = () => {
    setShowVerticalMenu((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) {
      setShowVerticalMenu(false);
    }
  }, [isOpen]);

  const handleMenuClick = (label: string) => {
    setActiveItem((prev) => (prev === label ? null : label));
  };

  const handleSubMenuClick = (label: string) => {
    setActiveSubMenuItem((prev) => (prev === label ? null : label));
  };

  // Memoize allMenuItems
  const allMenuItems = useMemo(
    () => [
      {
        title: t("sidebar.general.label"),
        items: [
          {
            label: t("sidebar.general.menues.calendarYear.label"),
            icon: <AIIcons.AiOutlineCalendar className="stroke-icon" />,
            subMenu: [
              {
                label: t("sidebar.general.menues.calendarYear.list"),
                link: "/calendar-year-list",
              },
              {
                label: t("sidebar.general.menues.calendarYear.add"),
                link: "/calendar-year-editor/new",
              },
            ],
            roles: [UserRole.ROOT_USER],
          },
          {
            label: t("sidebar.general.menues.subjects.label"),
            icon: <BIIcons.BiMath className="stroke-icon" />,
            subMenu: [
              {
                label: t("sidebar.general.menues.subjects.list"),
                link: "/subject-list",
              },
              {
                label: t("sidebar.general.menues.subjects.add"),
                link: "/subject-editor/new",
              },
            ],
            roles: [UserRole.ROOT_USER],
          },
          {
            label: t("sidebar.general.menues.dashboard"),
            icon: <AIIcons.AiOutlineHome className="stroke-icon" />,
            link: "/home",
            roles: [UserRole.ADMIN],
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
                link: "/library-editor/new",
                roles: [UserRole.ROOT_USER, UserRole.ADMIN],
              },
            ],
            roles: [
              UserRole.ADMIN,
              UserRole.ROOT_USER,
              UserRole.TEACHER,
              UserRole.STUDENT,
            ],
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
              {
                label: t("sidebar.general.menues.courses.list"),
                link: "/course-list",
              },
              {
                label: t("sidebar.general.menues.courses.add"),
                link: "/course-editor/new",
              },
            ],
            roles: [UserRole.ADMIN],
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
                link: "/timetable-editor/new",
              },
            ],
            roles: [UserRole.ADMIN],
          },
        ],
      },
      {
        title: t("sidebar.teachers.label"),
        items: [
          {
            label: t("sidebar.teachers.menues.list"),
            icon: (
              <LiaIcons.LiaChalkboardTeacherSolid className="stroke-icon" />
            ),
            link: "/teacher-list",
            roles: [UserRole.ADMIN],
          },
          {
            label: t("sidebar.teachers.menues.register"),
            icon: <AIIcons.AiOutlineUserAdd className="stroke-icon" />,
            link: "/teacher-editor/new",
            roles: [UserRole.ADMIN],
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
            roles: [UserRole.ADMIN],
          },
          {
            label: t("sidebar.students.menues.register"),
            icon: <AIIcons.AiOutlineUserAdd className="stroke-icon" />,
            link: "/student-editor/new",
            roles: [UserRole.ADMIN],
          },
        ],
      },
    ],
    [t]
  );

  // Helper function to check role permissions
  const hasRole = useCallback(
    (roles: UserRole[] | undefined): boolean => {
      return roles ? roles.includes(userRole!) : true;
    },
    [userRole]
  );

  // Function to filter and inherit roles for submenus
  // Memoized filter function
  const filterMenuItems = useCallback(
    (menuSections: MenuSection[]): MenuSection[] => {
      return menuSections
        .map((section) => ({
          ...section,
          items: section.items
            .map((item) => ({
              ...item,
              subMenu:
                item.subMenu
                  ?.map((subItem) => ({
                    ...subItem,
                    roles: subItem.roles || item.roles, // Inherit roles only if subItem roles are not defined
                  }))
                  .filter((subItem) => hasRole(subItem.roles)) || [], // Filter subMenu based on roles
            }))
            .filter(
              (item) => hasRole(item.roles) || (item.subMenu?.length ?? 0) > 0 // Ensure the item itself or its subMenu has valid roles
            ),
        }))
        .filter((section) =>
          section.items.some(
            (item) => hasRole(item.roles) || (item.subMenu?.length ?? 0) > 0 // Ensure the section has at least one valid item or submenu
          )
        );
    },
    [hasRole]
  );

  // Memoized filtered menu items
  const menuItems = useMemo(
    () => filterMenuItems(allMenuItems),
    [allMenuItems, filterMenuItems]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

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
                    hasSubMenu={(item.subMenu?.length ?? 0) > 0} // Check if item has a submenu
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

        <div className={`sidebar-footer ${!isOpen ? "hidden-footer" : ""}`}>
          <Link className="action-button" to="/login" onClick={handleLogout}>
            <FeatherIcon icon="log-out" />
          </Link>
          <Link className="action-button" to="/profile">
            <FeatherIcon icon="user" />
          </Link>
          <button className="action-button" onClick={toggleVerticalMenu}>
            <FeatherIcon icon="info" />
          </button>
        </div>

        {/* Vertical Menu */}
        {showVerticalMenu && (
          <div className={`vertical-menu ${!isOpen ? "hidden-footer" : ""}`}>
            <ul>
              <li>
                <Link to={"/settings"}>
                  <FeatherIcon icon="settings" />{" "}
                  {t("sidebar.footer.menu.settings")}
                </Link>
              </li>
              <li>
                <Link to={"/defaults"}>
                  <FeatherIcon icon="layers" />{" "}
                  {t("sidebar.footer.menu.defaults")}
                </Link>
              </li>

              <li>
                <Link to={"/faq"}>
                  <FeatherIcon icon="play-circle" />{" "}
                  {t("sidebar.footer.menu.howToUseTheApp")}
                </Link>
              </li>
              <li>
                <FeatherIcon icon="help-circle" />{" "}
                {t("sidebar.footer.menu.faq")}
              </li>
              <li>
                <FeatherIcon icon="edit-3" />{" "}
                {t("sidebar.footer.menu.suggestions")}
              </li>
              <li>
                <Link to="/privacy-policy">
                  <MDIcons.MdOutlinePrivacyTip size={24} />{" "}
                  {t("sidebar.footer.menu.privacyPolicy")}
                </Link>
              </li>
              <li>
                <FeatherIcon icon="info" /> {t("sidebar.footer.menu.about")}
              </li>
              <li>
                <FeatherIcon icon="file-text" />{" "}
                {t("sidebar.footer.menu.termsOfService")}
              </li>
              <li>
                <FeatherIcon icon="phone" />{" "}
                {t("sidebar.footer.menu.contactUs")}
              </li>
              <li>
                <FeatherIcon icon="message-circle" />{" "}
                {t("sidebar.footer.menu.feedback")}
              </li>
            </ul>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSideBar;
