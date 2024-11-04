import React from "react";
import AppLocalizerListItem from "./AppLocalizerListItem";
import { LocalizerProps } from "../properties/LocalizerProps";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";

const AppLocalizer: React.FC<LocalizerProps> = ({ isLinear = true }) => {
  const { t, changeLanguage } = useAppLocalizer();

  return (
    <ul className={isLinear ? "menu-linear-layout" : "menu-grid-layout"}>
      <AppLocalizerListItem
        language={t("languages.fa")}
        flag="af"
        onSelect={() => changeLanguage({ language: "fa-AF", direction: "rtl" })}
      />
      <AppLocalizerListItem
        language={t("languages.ps")}
        flag="af"
        onSelect={() => changeLanguage({ language: "ps-AF", direction: "rtl" })}
      />
      <AppLocalizerListItem
        language={t("languages.en")}
        flag="us"
        onSelect={() => changeLanguage({ language: "en-US", direction: "ltr" })}
      />
    </ul>
  );
};

export default AppLocalizer;
