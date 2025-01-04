import React from "react";
import { CardProps } from "./properties/CardProps";

const AppCard: React.FC<CardProps> = ({
  title,
  showFooter,
  footerChildren,
  children,
  className,
  onClick,
  actions,
}) => {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {title && (
        <div className="card-header d-flex align-items-center position-relative">
          <h4 className="card-title mb-0">{title}</h4>
          {actions && (
            <div className="card-actions position-absolute">{actions}</div>
          )}
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
