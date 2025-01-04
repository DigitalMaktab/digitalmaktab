import React from "react";
import { Properties } from "../properties/Properties";

const AppFormSectionContainer: React.FC<Properties> = ({
  title,
  actions,
  children,
}) => {
  return (
    <div className="form-container">
      <div className="d-flex align-items-center position-relative">
        <h4 className="card-title">{title}</h4>
        {actions && (
          <div className="card-actions position-absolute">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
};

export default AppFormSectionContainer;
