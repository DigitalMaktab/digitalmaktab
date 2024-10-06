import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppImg from "../../components/AppImg";
import AppPublicHeader from "../../components/public/AppPublicHeader";

import SupportSection from "../../components/public/SupportSection";
import AppPublicFooter from "../../components/public/AppPublicFooter";
import HomeSection from "../../components/public/HomeSection";
import FeaturesSection from "../../components/public/FeaturesSection";

const PublicScreen = () => {
  const { t } = useTranslation();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);
  return (
    <div className="page-wrapper">
      <AppPublicHeader />
      <HomeSection />
      <FeaturesSection />
      <SupportSection />
      <AppPublicFooter />
    </div>
  );
};

export default PublicScreen;
