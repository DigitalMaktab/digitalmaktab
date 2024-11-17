import React from "react";
import AppFormInput from "./AppFormInput";
import { useTranslation } from "react-i18next";
import { AddressFormProps } from "./properties/AddressFormProps";

const AppAddressForm: React.FC<AddressFormProps> = ({ prefix = "address" }) => {
  const { t } = useTranslation();
  const getName = (field: string) => `${prefix}.${field}`;
  return (
    <div className="address-form-container">
      <h4>{t("addressForm.title")}</h4>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.region.label")}
            name={getName("region")}
            required={true}
            placeholder={t("addressForm.region.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.village.label")}
            name={getName("village")}
            placeholder={t("addressForm.village.placeholder")}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.street.label")}
            name={getName("street")}
            placeholder={t("addressForm.street.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("addressForm.postalCode.label")}
            name={getName("postalCode")}
            placeholder={t("addressForm.postalCode.placeholder")}
          />
        </div>
      </div>
    </div>
  );
};

export default AppAddressForm;
