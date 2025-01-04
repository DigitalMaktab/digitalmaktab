import "react-i18next";

// Extend the default i18n resources type with your keys
declare module "react-i18next" {
  interface CustomTypeOptions {
    resources: {
      translation: typeof import("../public/locales/en-US/translation.json");
    };
  }
}
