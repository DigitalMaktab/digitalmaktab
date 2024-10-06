import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import AppImg from "../AppImg";

const AppPublicFooter = () => {
  const { t } = useTranslation();
  return (
    <section className="landing-footer section-py-space" id="footer">
      <div className="triangle"></div>
      <ul className="shape">
        <li className="shape1">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape1.png"
            alt=""
          />
        </li>
        <li className="shape2">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape2.png"
            alt=""
          />
        </li>
        <li className="shape3">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape3.png"
            alt=""
          />
        </li>
        <li className="shape4">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape4.png"
            alt=""
          />
        </li>
        <li className="shape5">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape5.png"
            alt=""
          />
        </li>
        <li className="shape6">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape6.png"
            alt=""
          />
        </li>
        <li className="shape7">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape1.png"
            alt=""
          />
        </li>
        <li className="shape8">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape1.png"
            alt=""
          />
        </li>
        <li className="shape9">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape7.png"
            alt=""
          />
        </li>
        <li className="shape10">
          <AppImg
            className="img-fluid"
            src="../assets/images/landing/footer/shape7.png"
            alt=""
          />
        </li>
      </ul>
      <Link className="footer-logo" to="/">
        <AppImg
          className="html-gif img-fluid img-32"
          src="../assets/images/landing/check.gif"
          alt=""
        />
      </Link>
      <ul className="star-rate"></ul>
      <h2>{t("public.footer.label")}</h2>
      <div className="btn-footer">
        <Link
          className="btn btn-lg btn-primary"
          to="/login"
          data-bs-original-title=""
          title=""
        >
          {t("auth.login.login")}
        </Link>
        <Link
          className="btn btn-lg btn-secondary"
          to="/signup"
          data-bs-original-title=""
          title=""
        >
          {t("auth.login.createAccount")}
        </Link>
      </div>
    </section>
  );
};

export default AppPublicFooter;
