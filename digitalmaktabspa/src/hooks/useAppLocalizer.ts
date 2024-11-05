import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SupportedLanguageProps } from "../components/properties/SupportedLanguageProps";

export const useAppLocalizer = () => {
  const { t, i18n } = useTranslation();

  const [language, setLanguage] = useState<SupportedLanguageProps>({
    language: i18n.language,
    direction:
      i18n.language === "fa-AF" || i18n.language === "ps-AF" ? "rtl" : "ltr",
  });

  useEffect(() => {
    // Update the direction based on the current language
    const direction =
      i18n.language === "fa-AF" || i18n.language === "ps-AF" ? "rtl" : "ltr";
    setLanguage({ language: i18n.language, direction });
  }, [i18n.language]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", language.direction);
    document.title = t("appName");
  }, [t, language.direction]);

  const changeLanguage = (lang: SupportedLanguageProps) => {
    i18n.changeLanguage(lang.language);
  };

  const formatNumber = useMemo(() => {
    return (page: number) => new Intl.NumberFormat(i18n.language).format(page);
  }, [i18n.language]);

  const formatCountryCode = useMemo(() => {
    return (code: number | string) => {
      const codeNumber = typeof code === "string" ? parseInt(code, 10) : code;
      return `+${new Intl.NumberFormat(i18n.language).format(codeNumber)}`;
    };
  }, [i18n.language]);

  return { language, changeLanguage, formatNumber, formatCountryCode, t, i18n };
};
