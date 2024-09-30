import FeatherIcon from "feather-icons-react";
import React from "react";
import { useTranslation } from "react-i18next";

const AppBreadCrumb = () => {
  const { t } = useTranslation();
  return (
    <div className="container-fluid">
      <div className="row page-title">
        <div className="col-sm-6">
          <h3>{t("breadcrumb.title")}</h3>
        </div>
        <div className="col-sm-6">
          <nav>
            <ol className="breadcrumb justify-content-sm-end align-items-center">
              <li className="breadcrumb-item">
                <FeatherIcon icon="home" className="svg-color" />
              </li>
              <li className="breadcrumb-item">{t("breadcrumb.title")}</li>
              <li className="breadcrumb-item active">
                {t("breadcrumb.title")}
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AppBreadCrumb;
