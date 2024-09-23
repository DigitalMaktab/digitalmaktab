import React, { useState } from "react";
import AppImg from "../../components/AppImg";
import FeatherIcon from "feather-icons-react";

const Signup = () => {
  const [formState, setFormState] = useState(0);
  const formSections = ["aboutcont", "addrescont", "verifycont"];
  const circleSections = [
    ".aboutblock .circulo",
    ".addressblock .circulo",
    ".verifyblock .circulo",
  ];

  const handleNext = () => {
    if (formState < formSections.length - 1) {
      setFormState((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (formState > 0) {
      setFormState((prev) => prev - 1);
    }
  };

  const progressBarWidths = ["15%", "50%", "85%"];
  return (
    <div className="container-fluid wizard-4">
      <div className="row">
        <div className="col-lg-3 col-md-4 position-relative">
          <ul className="anchor">
            <li>
              <a className="logo text-start ps-0" href="index.html">
                <img
                  className="img-fluid for-light"
                  src="../../resources/assets/dark-logo.svg"
                  alt="looginpage"
                />
                <AppImg
                  className="for-dark"
                  style={{ width: 350 }}
                  src={`${process.env.PUBLIC_URL}/assets/images/logo/logo-no-background.svg`}
                />
              </a>
            </li>
            <li>
              <div className="progresscont">
                <div className="circleblocks">
                  <div className="user-profile">
                    {circleSections.map((section, index) => (
                      <div key={index} className={`${section}block`}>
                        <div
                          className={`circulo text-center ${
                            formState === index ? "activecirculo" : ""
                          }`}
                        >
                          <FeatherIcon
                            icon={
                              index === 0
                                ? "user"
                                : index === 1
                                ? "map"
                                : "check"
                            }
                          />
                        </div>
                        <div className="user-content">
                          <h4 className="font-primary">
                            {index === 0
                              ? "About"
                              : index === 1
                              ? "Address"
                              : "Verify"}
                          </h4>
                          <h6>
                            {index === 0
                              ? "Add personal details"
                              : index === 1
                              ? "Add additional info"
                              : "Complete..!"}
                          </h6>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div className="col-lg-9 col-md-8 p-0">
          <div className="step-container login-card">
            <div>
              <div className="wizard-title text-center">
                <h2>Sign up to account</h2>
                <h5 className="text-muted mb-4">
                  Enter your email &amp; password to login
                </h5>
              </div>
              <div className="login-main">
                <div className="progress" style={{ height: "5px" }}>
                  <div
                    className="progress-bar"
                    id="progresswizard"
                    role="progressbar"
                    style={{ width: progressBarWidths[formState] }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
                <form className="theme-form">
                  <div className="registration-content">
                    {formState === 0 && (
                      <div data-progress="15%">
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="firstname">
                            First Name
                          </label>
                          <input
                            className="form-control"
                            id="firstname"
                            type="text"
                            name="firstname"
                            placeholder="Johan"
                          />
                        </div>
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="lastname">
                            Last Name{" "}
                          </label>
                          <input
                            className="form-control"
                            id="lastname"
                            type="text"
                            name="lastname"
                            placeholder="Deo"
                          />
                        </div>
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="phone">
                            phone
                          </label>
                          <input
                            className="form-control"
                            id="phone"
                            type="text"
                            name="phone"
                            placeholder="123456745"
                          />
                        </div>
                      </div>
                    )}
                    {formState === 1 && (
                      <div data-progress="50%">
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="email">
                            Email address
                          </label>
                          <input
                            className="form-control"
                            id="email"
                            type="text"
                            name="email"
                            placeholder="name@example.com"
                          />
                          <small
                            className="form-text text-muted"
                            id="emailHelp"
                          >
                            We&apos;ll never share your email with anyone else.
                          </small>
                        </div>
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="password">
                            Password
                          </label>
                          <input
                            className="form-control"
                            id="password"
                            type="text"
                            name="password"
                            placeholder="password"
                          />
                        </div>
                        <div className="form-group">
                          <label
                            className="col-form-label"
                            htmlFor="repassword"
                          >
                            Confirm Password
                          </label>
                          <input
                            className="form-control"
                            id="repassword"
                            type="text"
                            name="repassword"
                            placeholder="Enter again"
                          />
                        </div>
                      </div>
                    )}
                    {formState === 2 && (
                      <div data-progress="85%">
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="birthday">
                            Birthday:
                          </label>
                          <input
                            className="form-control"
                            id="birthday"
                            type="date"
                          />
                        </div>
                        <div className="form-group">
                          <label className="col-form-label" htmlFor="state">
                            State
                          </label>
                          <input
                            className="form-control"
                            id="state"
                            type="text"
                            name="state"
                            value="Ontario"
                          />
                        </div>
                        <div className="form-group">
                          <label className="col-form-label">Country </label>
                          <select
                            className="selectpicker countrypicker form-control"
                            name="country_residence"
                          >
                            <option value="">Canada</option>
                            <option value="">United States</option>
                            <option value="">United Kingdom</option>
                            <option value="">Germany</option>
                            <option value="">France</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mb-3 wizard-navigation">
                    <div className="p-2">
                      <button
                        className="btn m-1 btn-outline-primary btn-lg"
                        id="prevbtn"
                        type="button"
                        onClick={handlePrev}
                        disabled={formState === 0}
                      >
                        Previous
                      </button>
                    </div>
                    <div>
                      {formState < 2 && (
                        <button
                          className="btn m-1 btn-primary btn-lg text-center"
                          id="nextbtn"
                          type="button"
                          onClick={handleNext}
                        >
                          Next
                        </button>
                      )}
                      {formState === 2 && (
                        <button
                          className="btn btn-primary btn-lg"
                          type="submit"
                        >
                          Finish
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
