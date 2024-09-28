import React from "react";
import { ProgressCircleProps } from "../properties/WizardProps";
import FeatherIcon from "feather-icons-react";

const AppWizardProgressCircle: React.FC<ProgressCircleProps> = ({
  formState,
  steps,
}) => {
  return (
    <div className="progresscont">
      <div className="circleblocks">
        <div className="user-profile">
          {steps.map((step, index) => (
            <div key={index} className="block">
              <div
                className={`circulo text-center ${
                  formState === index ? "activecirculo" : ""
                }`}
              >
                <FeatherIcon icon={step.icon} />
              </div>
              <div className="user-content">
                <h4 className="font-primary">{step.title}</h4>
                <h6>{step.description}</h6>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppWizardProgressCircle;
