import React from "react";
import { Step } from "../../components/properties/WizardProps";
import AppWizard from "../../components/wizard/AppWizard";

import * as Yup from "yup";
import { WizardFormProps } from "../../components/properties/FormProps";
import AppFormInput from "../../components/form/AppFormInput";
import AppAddressForm from "../../components/form/AppAddressForm";
import { SchoolForAddDto } from "../../dtos/SchoolForAddDto";
import useSchoolOperations from "../../hooks/useSchoolOperations";
import { useNavigate } from "react-router-dom";
import { ResponseResult } from "../../dtos/ResultEnum";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { SchoolType } from "../../models/SchoolType";
import AppSchoolTypeSelect from "../../components/select/AppSchoolTypeSelect";
import AppFormSelect from "../../components/form/AppFormSelect";

const Signup = () => {
  const { t } = useAppLocalizer();
  const { registerSchool } = useSchoolOperations();
  const navigate = useNavigate();

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
          <AppFormSelect
            name="schoolType"
            label=""
            value={SchoolType.EMPTY.toString()}
            required={true}
          >
            <AppSchoolTypeSelect
              name="schoolType"
              required={true}
              value={SchoolType.EMPTY.toString()}
              onChange={() => {}}
            />
          </AppFormSelect>

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

  const initialValues: SchoolForAddDto = {
    schoolName: "",
    email: "",
    password: "",
    code: "",
    logo: null,
    phoneNumber: {
      countryId: "",
      number: "",
    },
    address: {
      street: "",
      village: "",
      region: "",
      postalCode: "",
    },
    schoolType: SchoolType.EMPTY,
  };

  const submit = async (school: SchoolForAddDto) => {
    school.confirmPassword = school.password;
    const formData = new FormData();

    formData.append("schoolName", school.schoolName);

    // Safely append address fields if they exist
    if (school.address && school.address.street) {
      formData.append("address.street", school.address.street);
    }
    if (school.address && school.address.village) {
      formData.append("address.village", school.address.village);
    }
    if (school.address && school.address.region) {
      formData.append("address.region", school.address.region);
    }
    if (school.address && school.address.postalCode) {
      formData.append("address.postalCode", school.address.postalCode);
    }

    // Safely append phone number fields if they exist
    if (school.phoneNumber && school.phoneNumber.countryId) {
      formData.append("phoneNumber.countryId", school.phoneNumber.countryId);
    }

    if (school.phoneNumber && school.phoneNumber.number) {
      formData.append("phoneNumber.number", school.phoneNumber.number);
    }

    formData.append("email", school.email);
    formData.append("password", school.password);

    if (school.confirmPassword) {
      formData.append("confirmPassword", school.confirmPassword);
    }

    // Only append logo if it's a valid File (avoid undefined or null errors)
    if (school.logo !== undefined && school.logo !== null) {
      formData.append("logo", school.logo);
    }

    formData.append("schoolType", school.schoolType.toString());

    formData.append("code", school.code);

    const result = await registerSchool(formData);

    if (result.status === ResponseResult.SUCCESS) {
      navigate("/login");
    }
  };

  const step1ValidationSchema: Yup.AnyObjectSchema = Yup.object().shape({
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
    schoolType: Yup.string().required(t("schoolType.validation.required")),
  });

  const step2ValidationSchema: Yup.AnyObjectSchema = Yup.object({
    address: Yup.object().shape({
      street: Yup.string(),
      village: Yup.string(),
      region: Yup.string().required(
        t("addressForm.region.validation.required")
      ),
      postalCode: Yup.string(),
    }),
  });

  // Define a union type for the two schemas

  const validationSchemas: Yup.AnyObjectSchema[] = [
    step1ValidationSchema,
    step2ValidationSchema,
  ];

  const formProps: WizardFormProps = {
    validationSchemas: validationSchemas,
    initialValues: initialValues,
    onSubmit: (values: typeof initialValues) => {
      submit(values);
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
