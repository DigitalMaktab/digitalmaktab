import React from "react";
import AppButton from "../../components/AppButton";
import FeatherIcon from "feather-icons-react";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="App">
      <div className="tap-top">
        <FeatherIcon icon="arrow-right" />
      </div>
      <div className="container-fluid p-0">
        <div className="row m-0">
          <div className="col-12 p-0">
            <div className="login-card login-dark">
              <div>
                <div className="login-main">
                  <form className="theme-form">
                    <h2 className="text-center">Sign in to account</h2>
                    <p className="text-center">
                      Enter your email &amp; password to login
                    </p>
                    <div className="form-group">
                      <label className="col-form-label">Email Address</label>
                      <input
                        className="form-control"
                        type="email"
                        placeholder="Test@gmail.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="col-form-label">Password</label>
                      <div className="form-input position-relative">
                        <input
                          className="form-control"
                          type="password"
                          name="login[password]"
                          placeholder="*********"
                        />
                        <div className="show-hide">
                          <span className="show"> </span>
                        </div>
                      </div>
                    </div>
                    <div className="form-group mb-0 checkbox-checked">
                      <div className="form-check checkbox-solid-info">
                        <input
                          className="form-check-input"
                          id="solid6"
                          type="checkbox"
                        />
                        <label className="form-check-label">
                          Remember password
                        </label>
                      </div>
                      <a className="link-two" href="forget-password.html">
                        Forgot password?
                      </a>
                      <AppButton label="Login" type="submit" disabled={false} />
                    </div>
                    <p className="mt-4 mb-0 text-center">
                      Don't have account?
                      <Link className="ms-2" to="/signup">
                        Create Account
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
