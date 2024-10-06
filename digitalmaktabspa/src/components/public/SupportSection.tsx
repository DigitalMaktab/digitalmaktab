import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import AppImg from "../AppImg";

const SupportSection = () => {
  const { t } = useTranslation();
  return (
    <section className="section-py-space support-section">
      <div className="title-style-1 text-center wow pulse">
        <h2 className="main-title">{t("public.support.title")}</h2>
        <AppImg src="../assets/images/landing/shape-1.png" className="" />
        <p className="description-title">“{t("public.support.description")}”</p>
      </div>
      <div className="container-fluid fluid-space">
        <div className="row align-items-center">
          <div className="col-lg-5 wow bounceInLeft order-1 order-lg-0">
            <div className="landing-title text-start">
              <h2>{t("public.support.details")}</h2>
              <p className="mx-0">{t("public.support.more")}</p>
              <Link
                className="btn btn-primary f-w-700 support-button"
                to="/support"
              >
                {t("public.support.title")}
              </Link>
            </div>
          </div>
          <div className="col-lg-7 support-img wow bounceInRight text-center text-lg-end">
            <AppImg
              src="./assets/images/landing/support.png"
              className="img-1"
            />
            <AppImg
              className="img-2"
              src="../assets/images/landing/arrow-2.png"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportSection;
