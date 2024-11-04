import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SupportedLanguageProps } from "../components/properties/SupportedLanguageProps";

export const useAppLocalizer = () => {
  const { t, i18n } = useTranslation();

  // Memoize initial language and direction
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

  return { language, changeLanguage, t, i18n };
};
