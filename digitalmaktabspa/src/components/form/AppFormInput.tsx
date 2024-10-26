import React, { memo } from "react";
import AppInput from "../input/AppInput";
import { FormInputProps } from "../properties/FormInputProps";
import AppErrorMessage from "../AppErrorMessage";
import { useField, useFormikContext } from "formik";

const AppFormInput: React.FC<FormInputProps> = memo(
  ({
    label,
    name,
    type = "text",
    placeholder = "",
    minLength,
    maxLength,
    required = false,
    ...props
  }) => {
    const [field, meta] = useField(name);
    const { setFieldValue } = useFormikContext();

    // Get error message if exists
    const error = meta.error && meta.touched ? meta.error : null;
    return (
      <>
        <AppInput
          label={label}
          type={type}
          {...field}
          placeholder={placeholder}
          setFieldValue={setFieldValue}
          value={field.value || ""}
          minLength={minLength ?? undefined}
          maxLength={maxLength ?? undefined}
          required={required}
          onBlur={field.onBlur}
          onChange={field.onChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`form-control ${
            meta.touched && meta.error ? "is-invalid" : ""
          }`}
          {...props}
        />
        {error && <AppErrorMessage error={error} visible={meta.touched} />}
      </>
    );
  }
);

export default AppFormInput;
