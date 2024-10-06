import React from "react";
import { FeatureCardProps } from "./properties/FeatureCardProps";

const AppPublicFeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
      <div className="feature-box">
        <div>
          <div className={`icon-wrraper ${icon.bgClassName}`}>{icon.icon}</div>
          <h4 className="mb-1">{title}</h4>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default AppPublicFeatureCard;
