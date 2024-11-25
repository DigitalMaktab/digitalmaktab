import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend) // Load translations from the backend
  .use(LanguageDetector) // Detect the user's language
  .use(initReactI18next) // Pass i18n to React
  .init({
    fallbackLng: "en-US", // Default language if detection fails
    debug: false, // Enable debug mode (set to false in production)
    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },
    backend: {
      // Path to load translations
      loadPath: "/locales/{{lng}}/translation.json", // Ensure the correct public path
    },
    detection: {
      // Detection options
      order: ["querystring", "cookie", "localStorage", "navigator"],
      lookupQuerystring: "lng", // Query string key (e.g., ?lng=en-US)
      lookupCookie: "i18next", // Cookie key
      lookupLocalStorage: "i18nextLng", // Local storage key
      caches: ["localStorage", "cookie"], // Cache languages in these
    },
    supportedLngs: ["en-US", "fa-AF", "ps-AF"], // List of supported languages
    load: "currentOnly", // Load only the current language (not all)
  });

export default i18n;
