import React, { memo, useCallback } from "react";
import AppInput from "../input/AppInput";
import { FormInputProps } from "../properties/FormInputProps";
import AppErrorMessage from "../AppErrorMessage";
import { useField } from "formik";

const AppFormInput: React.FC<FormInputProps> = memo(
  ({
    label,
    name,
    type = "text",
    placeholder = "",
    minLength,
    maxLength,
    required = false,
  }) => {
    const [field, meta] = useField(name);
    // Get error message if exists
    const error = meta.error && meta.touched ? meta.error : null;
    // Memoize the blur and change handlers to prevent unnecessary re-renders
    const handleBlur = useCallback(
      () => field.onBlur(name),
      [field.onBlur, name]
    );
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Ensure the event is passed correctly to Formik
        field.onChange(e);
      },
      [field.onChange]
    );
    return (
      <>
        <AppInput
          label={label}
          name={name}
          type={type}
          placeholder={placeholder}
          value={field.value || ""}
          minLength={minLength ?? undefined}
          maxLength={maxLength ?? undefined}
          required={required}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {error && <AppErrorMessage error={error} visible={true} />}
      </>
    );
  }
);

export default AppFormInput;
