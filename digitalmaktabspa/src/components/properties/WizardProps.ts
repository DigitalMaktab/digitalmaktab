import { Properties } from "./Properties";
import { FormProps } from "./FormProps";
export interface WizardProps {
  steps: Step[];
  formProps: FormProps;
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
}

export interface Step {
  title: string;
  description: string;
  icon: string;
  formContent: JSX.Element;
}
