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

  const formatNumber = (page: number) => {
    return new Intl.NumberFormat(i18n.language).format(page);
  };

  const formatCountryCode = (code: number | string) => {
    // Convert the code to a number if it’s a string to ensure consistent formatting
    const codeNumber = typeof code === "string" ? parseInt(code, 10) : code;

    // Format the code using the locale settings
    const formattedCode = new Intl.NumberFormat(i18n.language).format(
      codeNumber
    );

    // Add the "+" prefix
    return `+${formattedCode}`;
  };

  return { language, changeLanguage, formatNumber, formatCountryCode, t, i18n };
};
