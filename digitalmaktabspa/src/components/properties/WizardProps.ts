import { WizardFormProps } from "./FormProps";
import * as Yup from "yup";
export interface WizardProps {
  steps: Step[];
  formProps: WizardFormProps;
}

export interface ProgressCircleProps {
  formState: number;
  steps: Step[];
}

export interface FormSectionProps {
  formState: number;
  steps: Step[];
}

export interface AppWizardNavigationProps {
  formState: number;
  handlePrev: () => void;
  handleNext: () => void;
  totalSteps: number;
  validationSchema?: Yup.ObjectSchema<any>;
}

export interface Step {
  title: string;
  description: string;
  icon: string;
  formContent: JSX.Element;
}
