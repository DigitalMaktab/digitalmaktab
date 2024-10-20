import React from "react";
import AppFormInput from "./AppFormInput";
import { useTranslation } from "react-i18next";

const AppAddressForm = () => {
  const { t } = useTranslation();
  return (
    <div>
      <AppFormInput
        label={t("addressForm.street.label")}
        name="address.street"
        placeholder={t("addressForm.street.placeholder")}
      />
      <AppFormInput
        label={t("addressForm.village.label")}
        name="address.village"
        placeholder={t("addressForm.village.placeholder")}
      />
      <AppFormInput
        label={t("addressForm.region.label")}
        name="address.region"
        placeholder={t("addressForm.region.placeholder")}
      />
      <AppFormInput
        label={t("addressForm.postalCode.label")}
        name="address.postalCode"
        placeholder={t("addressForm.postalCode.placeholder")}
      />
    </div>
  );
};

export default AppAddressForm;
