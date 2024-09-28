import React from "react";
import { FormSectionProps } from "../properties/WizardProps";

const AppWizardFormSection: React.FC<FormSectionProps> = ({
  formState,
  steps,
}) => {
  return (
    <div className="registration-content">{steps[formState]?.formContent}</div>
  );
};

export default AppWizardFormSection;
