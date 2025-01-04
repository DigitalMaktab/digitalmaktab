import * as Yup from "yup";
export interface FormProps<T = any> {
  initialValues: T;
  onSubmit: (values: T) => void;
  validationSchema?: Yup.AnyObjectSchema;
  children?: React.ReactNode;
  reset?: boolean;
}

export interface WizardFormProps<T = any> extends FormProps<T> {
  validationSchemas?: Yup.AnyObjectSchema[];
}

export interface FormValues<T = any> {
  [key: string]: T;
}
