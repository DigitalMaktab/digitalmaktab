import React from "react";
import { CardProps } from "./properties/CardProps";
import { useTranslation } from "react-i18next";
import AppButton from "../AppButton";

const AppCard: React.FC<CardProps> = ({ title, showFooter, children }) => {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title mb-0">{title}</h4>
      </div>
      <div className="card-body">{children}</div>
      {showFooter && (
        <div className="card-footer text-end">
          <AppButton
            label={t("controls.saveButton.label")}
            type="submit"
            disabled={false}
            className="btn-primary"
          />
        </div>
      )}
    </div>
  );
};

export default AppCard;
