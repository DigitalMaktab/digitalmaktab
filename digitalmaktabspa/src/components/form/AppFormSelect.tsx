import React, { useCallback, useEffect } from "react";
import { FormSelectProps } from "./properties/FormSelectProps";
import AppErrorMessage from "../AppErrorMessage";
import { useField, useFormikContext } from "formik";

const AppFormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  type = "text",

  placeholder = "",
  minLength,
  maxLength,
  required = false,
  value,
  children,
  ...props
}) => {
  const [field, meta] = useField(name);
  const { setFieldValue, handleChange } = useFormikContext();

  const onChange = useCallback(
    (value: any) => {
      setFieldValue(name, value);
      handleChange(name);
    },
    [name, setFieldValue, handleChange]
  );

  // Get error message if exists
  const error = meta.error && meta.touched ? meta.error : null;

  return (
    <div className="form-group">
      {React.cloneElement(children as React.ReactElement, {
        name,
        value: value,
        onChange: onChange,
        onBlur: field.onBlur,
        "aria-invalid": !!error,
        "aria-describedby": error ? `${name}-error` : undefined,
        className: `form-control ${
          meta.touched && meta.error ? "is-invalid" : ""
        }`,
        ...props,
      })}
      {error && <AppErrorMessage error={error} visible={meta.touched} />}
    </div>
  );
};

export default AppFormSelect;
