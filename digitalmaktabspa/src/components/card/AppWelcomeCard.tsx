import React from "react";
import { WelcomeCardProps } from "./properties/CardProps";
import AppCard from "./AppCard";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";

const AppWelcomeCard: React.FC<WelcomeCardProps> = ({ welcomeTitle }) => {
  const { t } = useAppLocalizer();
  return (
    <AppCard className="profile-greeting card-hover">
      <div className="img-overlay">
        <h1>
          {t("welcomeCard.welcome.label", {
            value: welcomeTitle,
          })}
        </h1>
        <p>{t("welcomeCard.text.label")}</p>
      </div>
    </AppCard>
  );
};

export default AppWelcomeCard;
