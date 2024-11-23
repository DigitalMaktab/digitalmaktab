import React from "react";
import { Outlet } from "react-router-dom";
import AppScrollToTop from "../../components/AppScrollToTop";
import AppHeader from "../../components/AppHeader";
import AppSideBar from "../../components/AppSideBar";
import AppFooter from "../../components/AppFooter";
import AppBreadCrumb from "../../components/AppBreadCrumb";
import useHome from "../../hooks/useHome";

const RootHome = () => {
  const { isSidebarOpen, handleSidebarToggle } = useHome();

  return (
    <>
      <AppScrollToTop />
      <main
        className={`page-wrapper compact-wrapper ${
          !isSidebarOpen ? "sidebar-close" : ""
        }`}
        id="pageWrapper"
      >
        <AppHeader onSidebarToggle={handleSidebarToggle} />
        <div className="page-body-wrapper">
          <AppSideBar isOpen={isSidebarOpen} />
          <div className="page-body">
            <AppBreadCrumb />
            <Outlet />
          </div>
          <AppFooter />
        </div>
      </main>
    </>
  );
};

export default RootHome;
