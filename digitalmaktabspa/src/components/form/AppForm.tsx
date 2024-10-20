import React from "react";
import { FormProps } from "../properties/FormProps";
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
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      {({ isSubmitting }) => (
        <Form className="theme-form">
          {children}
          <button type="submit">
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default AppForm;
