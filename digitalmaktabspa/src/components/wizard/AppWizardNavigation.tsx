import React from "react";
import { AppWizardNavigationProps } from "../properties/WizardProps";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import { set } from "lodash";

const AppWizardNavigation: React.FC<AppWizardNavigationProps> = ({
  formState,
  handleNext,
  handlePrev,
  totalSteps,
  validationSchema,
}) => {
  const { t } = useTranslation();
  const { values, setTouched, setErrors, handleSubmit } = useFormikContext();

  const handleNextWithValidation = async () => {
    try {
      // Validate the current step's schema (including nested fields)
      await validationSchema!.validate(values, { abortEarly: false });

      // Proceed to the next step if there are no errors
      handleNext();
    } catch (err) {
      const validationErrors = err as Yup.ValidationError;

      // Structure errors for Formik
      const errors = validationErrors.inner.reduce((acc: any, error) => {
        if (error.path) {
          set(acc, error.path, error.message);
        }
        return acc;
      }, {});

      const touchedFields = validationErrors.inner.reduce((acc: any, error) => {
        if (error.path) {
          set(acc, error.path, true);
        }
        return acc;
      }, {});

      setTouched(touchedFields);
      setErrors(errors);
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
        <button
          className="btn btn-primary btn-lg"
          type="button"
          onClick={() => handleSubmit()}
        >
          {t("controls.wizard.finishButton.label")}
        </button>
      )}
    </div>
  );
};

export default AppWizardNavigation;
