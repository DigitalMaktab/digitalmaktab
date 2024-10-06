import React from "react";
import AppImg from "../AppImg";
import { useTranslation } from "react-i18next";

const HomeSection = () => {
  const { t } = useTranslation();
  return (
    <section className="landing-home" id="home">
      <div className="container-fluid fluid-space h-100">
        <div className="row h-100">
          <div className="col-12 col-lg-5 home-left order-1 order-lg-0">
            <div className="landing-title text-center text-lg-start">
              <h5 className="sub-title font-primary">
                <AppImg
                  className="html-gif img-fluid img-32"
                  src="../assets/images/landing/check.gif"
                  alt=""
                />
                {t("public.home.kickStart")}
              </h5>
              <h2 className="header-title">
                {t("slogan.learn")}{" "}
                <span className="gradient-1">{t("slogan.create")} </span>
                &nbsp;{t("slogan.change")}
              </h2>
              <p className="mx-0">{t("public.home.details")}</p>
            </div>
          </div>
          <div className="col-12 col-lg-7 home-right">
            <div className="landing-image">
              <AppImg
                className="img-fluid home-img"
                src="../assets/images/landing/home.png"
                alt=""
              />
              <ul className="img-fluid home-img animate-img">
                <li className="outline-text">
                  <h2>{t("appName")}</h2>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSection;
