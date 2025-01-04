import React, { useCallback } from "react";
import { useFormData } from "../hooks/useFormData";
import { useAppLocalizer } from "../hooks/useAppLocalizer";
import { getValidationSchema } from "../helper/helper";
import AppFormCard from "./card/AppFormCard";

type BaseEditorProps<T> = {
  initialData: Partial<T>;
  initialFormData: T;
  validationSchemaConfig: Record<keyof T, { label: string }>;
  onSubmit: (data: T) => Promise<void>;
  title: (formData: T) => string;
  children:
    | React.ReactNode
    | ((props: {
        formData: T;
        updateFormData: (data: Partial<T>) => void;
      }) => React.ReactNode);

  actions?: React.ReactNode;
};

const AppBaseEditor = <T extends Record<string, any>>({
  initialData,
  initialFormData,
  validationSchemaConfig,
  onSubmit,
  title,
  children,
  actions,
}: BaseEditorProps<T>) => {
  const { t } = useAppLocalizer();

  const [formData, updateFormData] = useFormData<T>(
    initialData,
    initialFormData
  );

  const validationSchema = getValidationSchema(validationSchemaConfig, t);

  const submitData = useCallback(
    async (data: T) => {
      try {
        await onSubmit(data);
      } catch (error) {
        console.error("Submission failed:", error);
      }
    },
    [onSubmit]
  );

  return (
    <AppFormCard
      title={title(formData)}
      initialValues={formData}
      onSubmit={submitData}
      validationSchema={validationSchema}
      actions={actions}
    >
      {typeof children === "function"
        ? children({ formData, updateFormData })
        : children}
    </AppFormCard>
  );
};

export default AppBaseEditor;
