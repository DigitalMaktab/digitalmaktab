import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { WizardProps } from "../properties/WizardProps";
import AppImg from "../AppImg";
import AppWizardProgressCircle from "./AppWizardProgressCircle";
import AppWizardFormSection from "./AppWizardFormSection";
import AppWizardNavigation from "./AppWizardNavigation";

const AppWizard: React.FC<WizardProps> = ({ steps }) => {
  const { t } = useTranslation();

  const [formState, setFormState] = useState<number>(0);

  const handleNext = () => {
    if (formState < steps.length - 1) setFormState((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (formState > 0) setFormState((prev) => prev - 1);
  };

  const progressPercentage = ((formState + 1) / steps.length) * 100;
  return (
    <div className="container-fluid wizard-4">
      <div className="row">
        <div className="col-lg-3 col-md-4 position-relative">
          <ul className="anchor">
            <li>
              <a className="logo text-start ps-0" href="index.html">
                <img
                  className="img-fluid for-light"
                  src="../../resources/assets/dark-logo.svg"
                  alt="login page"
                />
                <AppImg
                  className="for-dark"
                  src={`${process.env.PUBLIC_URL}/assets/images/logo/logo-no-background.svg`}
                />
              </a>
            </li>
            <li>
              <AppWizardProgressCircle formState={formState} steps={steps} />
            </li>
          </ul>
        </div>

        <div className="col-lg-9 col-md-8 p-0">
          <div className="step-container login-card">
            <div>
              <div className="wizard-title text-center">
                <h2>{t("auth.signup.createAccount")}</h2>
                <h5 className="text-muted mb-4">
                  {t("auth.signup.specifications")}
                </h5>
              </div>
              <div className="login-main">
                <div className="progress" style={{ height: "5px" }}>
                  <div
                    className="progress-bar"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <form className="theme-form">
                  <AppWizardFormSection formState={formState} steps={steps} />
                  <AppWizardNavigation
                    formState={formState}
                    handlePrev={handlePrev}
                    handleNext={handleNext}
                    totalSteps={steps.length}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppWizard;
