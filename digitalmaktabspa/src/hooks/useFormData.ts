import { useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * A hook for managing form data with support for initial and fallback data.
 *
 * @template T - The type of the form data.
 * @param initialData - Partial initial data or null.
 * @param fallbackData - Complete fallback data to ensure all required fields are present.
 * @returns A tuple containing the form data and a function to update it.
 */
export const useFormData = <T extends Record<string, any>>(
  initialData: Partial<T> | null,
  fallbackData: T
): [T, (data: Partial<T>) => void] => {
  const location = useLocation();

  // Combine `initialData` or `location.state?.initialData` with `fallbackData` to ensure a valid T object
  const [formData, setFormData] = useState<T>({
    ...fallbackData,
    ...(initialData || location.state?.initialData),
  });

  const updateFormData = (data: Partial<T>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  return [formData, updateFormData];
};
