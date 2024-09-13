import React from "react";
import AppLoader from "../components/AppLoader";
import AppScrollToTop from "../components/AppScrollToTop";
import AppHeader from "../components/AppHeader";
import AppSideBar from "../components/AppSideBar";
import AppBreadCrumb from "../components/AppBreadCrumb";
import AppTestContent from "../components/AppTestContent";
import AppFooter from "../components/AppFooter";

const Home = () => {
  return (
    <>
      <AppScrollToTop />
      <AppLoader />
      <main className="page-wrapper compact-wrapper" id="pageWrapper">
        <AppHeader />
        <div className="page-body-wrapper">
          <AppSideBar />
          <div className="page-body">
            <AppBreadCrumb />
            <AppTestContent />
          </div>
          <AppFooter />
        </div>
      </main>
    </>
  );
};

export default Home;
