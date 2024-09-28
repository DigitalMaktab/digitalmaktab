export interface FormProps {
  initialValues: Object;
  onSubmit: any;
  validationSchema: Object;
  children: React.ReactNode;
  reset?: boolean;
}
