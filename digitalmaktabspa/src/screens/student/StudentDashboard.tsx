import React, { useEffect, useMemo, useState } from "react";
import AppScrollToTop from "../../components/AppScrollToTop";
import AppHeader from "../../components/AppHeader";
import AppSideBar from "../../components/AppSideBar";
import AppBreadCrumb from "../../components/AppBreadCrumb";
import { Outlet } from "react-router-dom";
import AppFooter from "../../components/AppFooter";
import useWindowWidth from "../../hooks/useWindowWidth";

const StudentDashboard = () => {
  const windowWidth = useWindowWidth();
  // Memoize isMobileView to prevent recalculation on every render
  const isMobileView = useMemo(() => windowWidth <= 1199, [windowWidth]);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  // Update sidebar state on window resize
  useEffect(() => {
    setSidebarOpen(!isMobileView);
  }, [isMobileView]);

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

export default StudentDashboard;
