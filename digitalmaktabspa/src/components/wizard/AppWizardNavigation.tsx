import React from "react";
import { AppWizardNavigationProps } from "../properties/WizardProps";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";

const AppWizardNavigation: React.FC<AppWizardNavigationProps> = ({
  formState,
  handleNext,
  handlePrev,
  totalSteps,
}) => {
  const { t } = useTranslation();
  const { validateForm, setTouched, setErrors } = useFormikContext();

  const handleNextWithValidation = async () => {
    // Validate the form and get validation errors
    const errors = await validateForm();

    // Mark all fields as touched to display validation messages
    if (Object.keys(errors).length === 0) {
      handleNext(); // Proceed to next step if no errors
    } else {
      // Set all fields as touched and set errors so validation messages are shown
      setTouched(
        Object.keys(errors).reduce(
          (acc, field) => ({ ...acc, [field]: true }),
          {}
        )
      );
      setErrors(errors); // Ensures that errors are set
    }
  };

  return (
    <div className="mb-3 wizard-navigation">
      <button
        type="button"
        className="btn m-1 btn-outline-primary btn-lg"
        onClick={handlePrev}
        disabled={formState === 0}
      >
        {t("controls.wizard.previousButton.label")}
      </button>
      {formState < totalSteps - 1 ? (
        <button
          type="button"
          className="btn m-1 btn-primary btn-lg"
          onClick={handleNextWithValidation}
        >
          {t("controls.wizard.nextButton.label")}
        </button>
      ) : (
        <button className="btn btn-primary btn-lg" type="button">
          {t("controls.wizard.finishButton.label")}
        </button>
      )}
    </div>
  );
};

export default AppWizardNavigation;
