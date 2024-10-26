import * as Yup from "yup";
export interface FormProps {
  initialValues: Object;
  onSubmit: any;
  validationSchema?: Yup.AnyObjectSchema;
  children: React.ReactNode;
  reset?: boolean;
}

export interface WizardFormProps extends FormProps {
  validationSchemas?: Yup.AnyObjectSchema[];
}
