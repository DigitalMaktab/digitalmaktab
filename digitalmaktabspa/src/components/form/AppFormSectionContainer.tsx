import React from "react";
import { Properties } from "../properties/Properties";

const AppFormSectionContainer: React.FC<Properties> = ({ title, children }) => {
  return (
    <div className="form-container">
      <h4>{title}</h4>
      {children}
    </div>
  );
};

export default AppFormSectionContainer;
