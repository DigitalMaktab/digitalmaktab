import React, { useEffect, useMemo, useState } from "react";
import AppLocalizerListItem from "./AppLocalizerListItem";
import { useTranslation } from "react-i18next";
import { SupportedLanguageProps } from "../properties/SupportedLanguageProps";
import { LocalizerProps } from "../properties/LocalizerProps";

const AppLocalizer: React.FC<LocalizerProps> = ({ isLinear = true }) => {
  const { t, i18n } = useTranslation();

  // Memoize the initial language and direction based on the current language in i18n
  const initialLanguage: SupportedLanguageProps = useMemo(() => {
    const currentLanguage = i18n.language;
    const direction =
      currentLanguage === "fa-AF" || currentLanguage === "ps-AF"
        ? "rtl"
        : "ltr";

    return { language: currentLanguage, direction };
  }, [i18n.language]);

  const [language, setLanguage] =
    useState<SupportedLanguageProps>(initialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute("dir", language.direction);
    document.title = t("appName");
  }, [t, language.direction]);

  const changeLanguage = (lang: SupportedLanguageProps) => {
    i18n.changeLanguage(lang.language);
    setLanguage(lang);
  };

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
