import React from "react";
import { FormProps, FormValues } from "../properties/FormProps";
import { Formik, Form } from "formik";

const AppForm: React.FC<FormProps> = ({
  initialValues,
  onSubmit,
  validationSchema,
  children,
  reset,
}) => {
  return (
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={validationSchema}
      validateOnBlur
      validateOnChange
      validateOnMount
      onSubmit={(values: FormValues, { setTouched, validateForm }) => {
        setTouched(
          Object.keys(values).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>)
        );
        validateForm();

        onSubmit(values);
      }}
    >
      {<Form className="theme-form">{children}</Form>}
    </Formik>
  );
};

export default AppForm;
