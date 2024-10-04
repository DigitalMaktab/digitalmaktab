import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import AppImg from "../../components/AppImg";
import AppPublicHeader from "../../components/public/AppPublicHeader";

const PublicScreen = () => {
  const { t } = useTranslation();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);
  return (
    <div className="page-wrapper">
      <AppPublicHeader />
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
      <section className="section-py-space features-section" id="feature">
        <div className="container-fluid fluid-space">
          <div className="row">
            <div className="col-sm-12 wow pulse">
              <div className="title-style-1 text-center">
                <h2 className="main-title">
                  {t("public.header.features.label")}
                </h2>
                <img src="../assets/images/landing/shape-1.png" alt="" />
                <p className="description-title">
                  We are using scss 7-1 tire folder structure for this admin
                  template
                </p>
              </div>
            </div>
          </div>
          <div className="row g-3 g-sm-5 feature-content">
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-1">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-html"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Quality & Clean Code</h4>
                  <p>
                    All you need to know of using clean code as a manager to
                    make your team and your software awesome.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-2">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-bootstrap"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Bootstrap v5.0</h4>
                  <p>
                    Bootstrap is built on designed to be responsive 12- column
                    grids, it automatically adjusts the layout.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-3">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#handmade-landing"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Handmade icons</h4>
                  <p>
                    let’s learn how to use our own svg icons in edmin admin
                    template. icon system with svg sprites
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-4">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-components"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Limitless components</h4>
                  <p>
                    The limitless laypout collection and ui kit library is the
                    biggest collection of layout for web design
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-5">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-customizer"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Easy Customizable</h4>
                  <p>
                    Easy step-by-step guide for beginners. customize your
                    layout, settings and content
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-6">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-responsive"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Responsive & user-Friendly</h4>
                  <p>
                    Use responsive design to connect with all device users start
                    designing your website for mobile devices.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-7">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-support"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Premium support</h4>
                  <p>
                    Bwe are always be their for your support and you are facing
                    some issues you can create ticket.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-4 col-sm-6 wow flipInX">
              <div className="feature-box">
                <div>
                  <div className="icon-wrraper bg-8">
                    <svg className="svg-w-25">
                      <use href="https://admin.pixelstrap.net/edmin/assets/svg/iconly-sprite.svg#landing-colors"></use>
                    </svg>
                  </div>
                  <h4 className="mb-1">Colors Options</h4>
                  <p>
                    edmin provide unlimited main color option.other colors can
                    change easily using sass variables
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section-py-space support-section">
        <div className="title-style-1 text-center wow pulse">
          <h2 className="main-title">{t("public.support.title")}</h2>
          <img src="../assets/images/landing/shape-1.png" alt="" />
          <p className="description-title">
            “{t("public.support.description")}”
          </p>
        </div>
        <div className="container-fluid fluid-space">
          <div className="row align-items-center">
            <div className="col-lg-5 wow bounceInLeft order-1 order-lg-0">
              <div className="landing-title text-start">
                <h5 className="sub-title font-primary mb-2">Our License</h5>
                <h2>we give it as we think that excellent support is needed</h2>
                <p className="mx-0">
                  Check our reviews for fast and accurate support to ensure
                  support. we offer premium assistance around-the-clock for any
                  bugs you encounter. and we’ll do best to help you out with any
                  future updates for free.
                </p>
                <a
                  className="btn btn-primary f-w-700 support-button"
                  href="https://support.pixelstrap.com/"
                  target="_blank"
                >
                  Support
                </a>
              </div>
            </div>
            <div className="col-lg-7 support-img wow bounceInRight text-center text-lg-end">
              <img
                className="img-1"
                src="../assets/images/landing/support.png"
                alt=""
              />
              <img
                className="img-2"
                src="../assets/images/landing/arrow-2.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </section>
      <section className="landing-footer section-py-space" id="footer">
        <div className="triangle"></div>
        <ul className="shape">
          <li className="shape1">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape1.png"
              alt=""
            />
          </li>
          <li className="shape2">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape2.png"
              alt=""
            />
          </li>
          <li className="shape3">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape3.png"
              alt=""
            />
          </li>
          <li className="shape4">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape4.png"
              alt=""
            />
          </li>
          <li className="shape5">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape5.png"
              alt=""
            />
          </li>
          <li className="shape6">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape6.png"
              alt=""
            />
          </li>
          <li className="shape7">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape1.png"
              alt=""
            />
          </li>
          <li className="shape8">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape1.png"
              alt=""
            />
          </li>
          <li className="shape9">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape7.png"
              alt=""
            />
          </li>
          <li className="shape10">
            <img
              className="img-fluid"
              src="../assets/images/landing/footer/shape7.png"
              alt=""
            />
          </li>
        </ul>
        <a className="footer-logo" href="index.html">
          <AppImg
            className="html-gif img-fluid img-32"
            src="../assets/images/landing/check.gif"
            alt=""
          />
        </a>
        <ul className="star-rate">
          <li>
            <i className="fa fa-star font-warning"></i>
          </li>
          <li>
            <i className="fa fa-star font-warning"></i>
          </li>
          <li>
            <i className="fa fa-star font-warning"></i>
          </li>
          <li>
            <i className="fa fa-star font-warning"> </i>
          </li>
          <li>
            <i className="fa-regular fa-star font-warning"> </i>
          </li>
        </ul>
        <h2>{t("public.footer.label")}</h2>
        <div className="btn-footer">
          <Link
            className="btn btn-lg btn-primary"
            target="_blank"
            to="/login"
            data-bs-original-title=""
            title=""
          >
            {t("auth.login.login")}
          </Link>
          <Link
            className="btn btn-lg btn-secondary"
            target="_blank"
            to="/signup"
            data-bs-original-title=""
            title=""
          >
            {t("auth.login.createAccount")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PublicScreen;
