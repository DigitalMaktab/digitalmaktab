import { useState } from "react";
import { useLocation } from "react-router-dom";
import * as Yup from "yup";

/**
 * A hook for managing form data with support for initial and fallback data, including validation and reset functionality.
 *
 * @template T - The type of the form data.
 * @param initialData - Partial initial data or null.
 * @param fallbackData - Complete fallback data to ensure all required fields are present.
 * @param validationSchema - Optional Yup schema for validation.
 * @returns A tuple containing the form data, update function, reset function, and a validation status.
 */
export const useFormData = <T extends Record<string, any>>(
  initialData: Partial<T> | null,
  fallbackData: T,
  validationSchema?: Yup.ObjectSchema<any>
): [T, (data: Partial<T>) => Promise<void>, () => void, boolean] => {
  const location = useLocation();

  const [formData, setFormData] = useState<T>({
    ...fallbackData,
    ...(initialData || location.state?.initialData),
  });

  const [isValid, setIsValid] = useState(true);

  const updateFormData = async (data: Partial<T>) => {
    const updatedData = { ...formData, ...data };

    if (validationSchema) {
      try {
        await validationSchema.validate(updatedData, { abortEarly: false });
        setIsValid(true);
      } catch {
        setIsValid(false);
      }
    }

    setFormData(updatedData);
  };

  const resetFormData = () => {
    setFormData({
      ...fallbackData,
      ...(initialData || location.state?.initialData),
    });
    setIsValid(true);
  };

  return [formData, updateFormData, resetFormData, isValid];
};
