import React from "react";
import AppFormInput from "./AppFormInput";
import { useTranslation } from "react-i18next";
import { NationalIdProps } from "./properties/NationalIdProps";
import AppFormSectionContainer from "./AppFormSectionContainer";

const AppNationalIdForm: React.FC<NationalIdProps> = ({
  title,
  prefix = "nationalId",
}) => {
  const { t } = useTranslation();
  const getName = (field: string) => `${prefix}.${field}`;
  return (
    <AppFormSectionContainer title={title ? title : t("nationalId.title")}>
      <div className="row">
        <div className="col-md-12">
          <AppFormInput
            label={t("nationalId.electronicNationalIdNumber.label")}
            name={getName("electronicNationalIdNumber")}
            placeholder={t("nationalId.electronicNationalIdNumber.placeholder")}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("nationalId.nationalIdNumber.label")}
            name={getName("nationalIdNumber")}
            placeholder={t("nationalId.nationalIdNumber.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("nationalId.volume.label")}
            name={getName("volume")}
            placeholder={t("nationalId.volume.placeholder")}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("nationalId.page.label")}
            name={getName("page")}
            placeholder={t("nationalId.page.placeholder")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("nationalId.registerNumber.label")}
            name={getName("registerNumber")}
            placeholder={t("nationalId.registerNumber.placeholder")}
          />
        </div>
      </div>
    </AppFormSectionContainer>
  );
};

export default AppNationalIdForm;
