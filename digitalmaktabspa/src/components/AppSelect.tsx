import React from "react";
import { SelectProps } from "./properties/SelectProps";

const AppSelect: React.FC<SelectProps> = ({ label, name, children }) => (
  <div className="form-group">
    <label className="col-form-label">{label}</label>
    <select className="form-control" name={name}>
      {children}
    </select>
  </div>
);

export default AppSelect;
