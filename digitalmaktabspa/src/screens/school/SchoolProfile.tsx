import React, { useEffect, useState } from "react";
import { getUser } from "../../helper/helper";
import { useTranslation } from "react-i18next";
import AppCard from "../../components/card/AppCard";
import AppImg from "../../components/AppImg";
import AppForm from "../../components/form/AppForm";
import { School } from "../../models/School";
import { SchoolForUpdateDto } from "../../dtos/SchoolForUpdateDto";
import AppAddressForm from "../../components/form/AppAddressForm";
import AppFormInput from "../../components/form/AppFormInput";
import { PhoneNumberValue } from "../../components/properties/InputProps";

const SchoolProfile = () => {
  const [school, setSchool] = useState<School>(getUser()!.school!);
  const { t } = useTranslation();

  const initialValues: SchoolForUpdateDto = school;

  return (
    <div className="container-fluid edit-profile">
      <div className="row">
        <div className="col-xl-4">
          <AppCard title={t("profile.label")}>
            <div>
              <div className="row mb-2">
                <div className="profile-title">
                  <div className="d-flex">
                    {school.logo && (
                      <AppImg
                        className="img-70 rounded-circle"
                        alt={school.schoolName}
                        src={`http://0.0.0.0:5000/${school.logo}`}
                      />
                    )}
                    <div className="flex-grow-1">
                      <h5 className="mb-1">{school.schoolName}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t("auth.email.label")}</label>
                <input
                  className="form-control"
                  placeholder={school.email}
                  readOnly
                  onChange={() => {}}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("auth.password.label")}</label>
                <input
                  className="form-control"
                  type="password"
                  value="password"
                  readOnly
                  onChange={() => {}}
                />
              </div>
            </div>
          </AppCard>
        </div>
        <div className="col-xl-8">
          <AppForm
            initialValues={initialValues}
            onSubmit={(schoolData: SchoolForUpdateDto) => {
              console.log(schoolData);
            }}
          >
            <AppCard title={t("profile.editProfile.label")} showFooter={false}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <AppFormInput
                      name="schoolName"
                      label={t("auth.signup.schoolName.label")}
                      required
                    />
                  </div>
                </div>
                <div className="col-sm-6 col-md-6">
                  <div className="mb-3">
                    <AppFormInput
                      name="code"
                      label={t("auth.signup.code.label")}
                      required
                    />
                  </div>
                </div>
                <AppFormInput
                  label={t("auth.signup.phoneNumber.label")}
                  name="phoneNumber.number"
                  placeholder={t("auth.signup.phoneNumber.placeholder")}
                  type="phoneNumber"
                  required={true}
                  phoneNumber={initialValues.phoneNumber as PhoneNumberValue}
                />
                <AppAddressForm />
              </div>
            </AppCard>
          </AppForm>
        </div>
      </div>
    </div>
  );
};

export default SchoolProfile;
