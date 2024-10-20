import React, { useState } from "react";
import AppInput from "../../components/input/AppInput";
import { Step } from "../../components/properties/WizardProps";
import AppSelect from "../../components/AppSelect";
import AppWizard from "../../components/wizard/AppWizard";

import * as Yup from "yup";
import { FormProps } from "../../components/properties/FormProps";
import AppFormInput from "../../components/form/AppFormInput";
import { useTranslation } from "react-i18next";

const Signup = () => {
  const { t } = useTranslation();
  const steps: Step[] = [
    {
      title: t("auth.signup.about.label"),
      description: t("auth.signup.about.description"),
      icon: "user",
      formContent: (
        <>
          <AppFormInput
            label={t("auth.signup.schoolName.label")}
            name="schoolName"
            placeholder={t("auth.signup.schoolName.placeholder")}
          />
          <AppFormInput
            label={t("auth.email.label")}
            name="email"
            placeholder={t("auth.email.placeholder")}
          />
          <AppFormInput
            label={t("auth.signup.code.label")}
            name="code"
            placeholder={t("auth.signup.code.placeholder")}
          />

          <AppFormInput
            label={t("auth.signup.phoneNumber.label")}
            name="number"
            placeholder={t("auth.signup.phoneNumber.placeholder")}
            type="phoneNumber"
          />
          <AppFormInput
            label={t("auth.signup.logo.label")}
            name="logo"
            type="file"
            placeholder={t("auth.signup.logo.placeholder")}
          />
        </>
      ),
    },
    {
      title: t("auth.signup.address.label"),
      description: t("auth.signup.address.description"),
      icon: "map",
      formContent: (
        <>
          <AppInput
            label="Email address"
            name="email"
            placeholder="name@example.com"
          />
          <AppInput label="Password" name="password" placeholder="password" />
          <AppInput
            label="Confirm Password"
            name="repassword"
            placeholder="Enter again"
          />
        </>
      ),
    },
    {
      title: t("auth.signup.verify.label"),
      description: t("auth.signup.verify.description"),
      icon: "check",
      formContent: (
        <>
          <AppInput label="Birthday" name="birthday" type="date" />
          <AppInput label="State" name="state" value="Ontario" />
          <AppSelect label="Country" name="country_residence">
            <option value="Canada">Canada</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
          </AppSelect>
        </>
      ),
    },
  ];

  const initialValues = {
    schoolName: "",
    email: "",
  };
  const formProps: FormProps = {
    validationSchema: Yup.object().shape({
      schoolName: Yup.string().required(
        t("auth.signup.schoolName.validation.required")
      ),
      email: Yup.string()
        .required(t("auth.email.validation.required"))
        .email(t("auth.email.validation.invalid")),
      code: Yup.string().required(t("auth.signup.code.validation.required")),
      number: Yup.string().required(
        t("auth.signup.phoneNumber.validation.required")
      ),
    }),
    initialValues: initialValues,
    onSubmit: (values: typeof initialValues) => {
      console.log(values);
    },
    children: <></>,
  };

  return (
    <>
      <AppWizard steps={steps} formProps={formProps} />
    </>
  );
};

export default Signup;
