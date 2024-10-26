import React from "react";
import AppFormInput from "./AppFormInput";
import { useTranslation } from "react-i18next";

const AppAddressForm = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.region.label")}
            name="address.region"
            required={true}
            placeholder={t("addressForm.region.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.village.label")}
            name="address.village"
            placeholder={t("addressForm.village.placeholder")}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.street.label")}
            name="address.street"
            placeholder={t("addressForm.street.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.postalCode.label")}
            name="address.postalCode"
            placeholder={t("addressForm.postalCode.placeholder")}
          />
        </div>
      </div>
    </div>
  );
};

export default AppAddressForm;
