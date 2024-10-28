import "react-i18next";

// Extending the default i18n with our keys
declare module "react-i18next" {
  interface Resources {
    translation: typeof import("../../public/locales/en-US/translation.json");
  }
}
