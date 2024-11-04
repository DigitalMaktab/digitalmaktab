import React from "react";
import { CardProps } from "./properties/CardProps";
import { useTranslation } from "react-i18next";

const AppCard: React.FC<CardProps> = ({
  title,
  showFooter,
  footerChildren,
  children,
  className,
}) => {
  const { t } = useTranslation();
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h4 className="card-title mb-0">{title}</h4>
        </div>
      )}
      <div className="card-body">{children}</div>
      {showFooter && (
        <div className="card-footer text-end">{footerChildren}</div>
      )}
    </div>
  );
};

export default AppCard;
