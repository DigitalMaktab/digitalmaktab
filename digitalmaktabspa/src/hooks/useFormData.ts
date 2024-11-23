import { useState } from "react";
import { useLocation } from "react-router-dom";

export const useFormData = <T>(
  initialData: T | null,
  fallbackData: T
): [T, (data: Partial<T>) => void] => {
  const location = useLocation();
  const [formData, setFormData] = useState<T>(
    initialData || location.state?.initialData || fallbackData
  );

  const updateFormData = (data: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return [formData, updateFormData];
};
