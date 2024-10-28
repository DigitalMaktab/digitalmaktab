import React from "react";
import { useTranslation } from "react-i18next";
import { AiFillHeart } from "react-icons/ai";

const AppFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-6 footer-copyright">
            <p className="mb-0">{t("footer.copyright")}</p>
          </div>
          <div className="col-md-6">
            <p className="float-end mb-0">
              {t("footer.label")} <AiFillHeart size={20} color="red" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
