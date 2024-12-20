import FeatherIcon from "feather-icons-react";
import React from "react";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";

const PrivacyPolicy = () => {
  const { t } = useAppLocalizer();

  const policySections = [
    {
      title: t("privacyPolicy.personalData.title"),
      content: t("privacyPolicy.personalData.description"),
    },
    {
      title: t("privacyPolicy.dataUsage.title"),
      content: t("privacyPolicy.dataUsage.description"),
    },
    {
      title: t("privacyPolicy.thirdParties.title"),
      content: t("privacyPolicy.thirdParties.description"),
    },
    {
      title: t("privacyPolicy.dataRetention.title"),
      content: t("privacyPolicy.dataRetention.description"),
    },
    {
      title: t("privacyPolicy.rights.title"),
      content: t("privacyPolicy.rights.description"),
    },
  ];

  return (
    <div className="privacy-policy-page">
      <header className="privacy-policy-header">
        <h1 className="privacy-policy-title">
          {t("privacyPolicy.header.title")}
        </h1>
        <p className="privacy-policy-subtitle">
          {t("privacyPolicy.header.subtitle")}
        </p>
      </header>
      <main className="privacy-policy-content">
        <section className="privacy-policy-intro">
          <p>{t("privacyPolicy.intro")}</p>
        </section>
        <div className="privacy-policy-sections">
          {policySections.map((section, index) => (
            <div key={index} className="policy-section">
              <h2 className="policy-section-title">
                <FeatherIcon icon="chevron-right" className="policy-icon" />
                {section.title}
              </h2>
              <p className="policy-section-content">{section.content}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="privacy-policy-footer">
        <button className="action-button back-button">
          <FeatherIcon icon="arrow-left" />
          {t("privacyPolicy.footer.back")}
        </button>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
