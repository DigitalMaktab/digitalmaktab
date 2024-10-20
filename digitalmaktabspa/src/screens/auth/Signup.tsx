import React, { useState } from "react";
import { Step } from "../../components/properties/WizardProps";
import AppWizard from "../../components/wizard/AppWizard";

import * as Yup from "yup";
import { FormProps } from "../../components/properties/FormProps";
import AppFormInput from "../../components/form/AppFormInput";
import { useTranslation } from "react-i18next";
import AppAddressForm from "../../components/form/AppAddressForm";

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
            required={true}
            placeholder={t("auth.signup.schoolName.placeholder")}
          />
          <AppFormInput
            label={t("auth.email.label")}
            name="email"
            required={true}
            placeholder={t("auth.email.placeholder")}
          />
          <AppFormInput
            label={t("auth.password.label")}
            name="password"
            type="password"
            required={true}
            placeholder={t("auth.password.placeholder")}
          />
          <AppFormInput
            label={t("auth.signup.code.label")}
            name="code"
            required={true}
            placeholder={t("auth.signup.code.placeholder")}
          />

          <AppFormInput
            label={t("auth.signup.phoneNumber.label")}
            name="phoneNumber.number"
            placeholder={t("auth.signup.phoneNumber.placeholder")}
            type="phoneNumber"
            required={true}
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
          <AppAddressForm />
        </>
      ),
    },
    {
      title: t("auth.signup.verify.label"),
      description: t("auth.signup.verify.description"),
      icon: "check",
      formContent: <></>,
    },
  ];

  const initialValues = {
    schoolName: "",
    email: "",
    password: "",
    code: "",
    phoneNumber: {
      countryId: "", // Nested structure
      number: "", // Nested structure
    },
    address: {
      street: "",
    },
  };

  const formProps: FormProps = {
    validationSchema: Yup.object().shape({
      schoolName: Yup.string().required(
        t("auth.signup.schoolName.validation.required")
      ),
      email: Yup.string()
        .required(t("auth.email.validation.required"))
        .email(t("auth.email.validation.invalid")),
      password: Yup.string()
        .required(t("auth.password.validation.required"))
        .min(8, t("auth.password.validation.atLeast8Chars")),
      code: Yup.string().required(t("auth.signup.code.validation.required")),
      phoneNumber: Yup.object().shape({
        countryId: Yup.string().required(
          t("auth.signup.countryId.validation.required")
        ),
        number: Yup.string().required(
          t("auth.signup.phoneNumber.validation.required")
        ),
      }),
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
