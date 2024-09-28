import React, { useState } from "react";
import AppInput from "../../components/AppInput";
import { Step } from "../../components/properties/WizardProps";
import AppSelect from "../../components/AppSelect";
import AppWizard from "../../components/wizard/AppWizard";
import AppForm from "../../components/form/AppForm";
import AppFormInput from "../../components/form/AppFormInput";

import * as Yup from "yup";
import AppHeader from "../../components/AppHeader";
import AppLocalizer from "../../components/dropdown/AppLocalizer";

const steps: Step[] = [
  {
    title: "About",
    description: "Add personal details",
    icon: "user",
    formContent: (
      <>
        <AppInput label="First Name" name="firstname" placeholder="Johan" />
        <AppInput label="Last Name" name="lastname" placeholder="Deo" />
        <AppInput label="Phone" name="phone" placeholder="123456745" />
      </>
    ),
  },
  {
    title: "Address",
    description: "Add additional info",
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
    title: "Verify",
    description: "Complete..!",
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

const Signup = () => {
  const validationSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email").required("Email is required"),
  });

  const initialValues = {
    email: "",
  };

  const handleSubmit = (values: typeof initialValues) => {
    console.log(values);
  };

  return (
    <>
      <AppWizard steps={steps} />
    </>
  );
  // return (
  //   <AppForm
  //     initialValues={initialValues}
  //     onSubmit={handleSubmit}
  //     validationSchema={validationSchema}
  //   >
  //     <AppFormInput
  //       label="Email"
  //       name="email"
  //       type="text"
  //       placeholder="john.doe@email.com"
  //     />
  //   </AppForm>
  // );
};

export default Signup;
