import React from "react";
import { AppWizardNavigationProps } from "../properties/WizardProps";

const AppWizardNavigation: React.FC<AppWizardNavigationProps> = ({
  formState,
  handleNext,
  handlePrev,
  totalSteps,
}) => {
  return (
    <div className="mb-3 wizard-navigation">
      <button
        type="button"
        className="btn m-1 btn-outline-primary btn-lg"
        onClick={handlePrev}
        disabled={formState === 0}
      >
        Previous
      </button>
      {formState < totalSteps - 1 ? (
        <button
          type="button"
          className="btn m-1 btn-primary btn-lg"
          onClick={handleNext}
        >
          Next
        </button>
      ) : (
        <button className="btn btn-primary btn-lg" type="button">
          Finish
        </button>
      )}
    </div>
  );
};

export default AppWizardNavigation;
