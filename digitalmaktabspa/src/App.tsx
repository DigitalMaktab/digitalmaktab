import React from "react";
import logo from "./logo.svg";
import "./App.css";
import AppButton from "./components/AppButton";

function App() {
  return (
    <div className="App">
      <div className="tap-top">
        <svg className="feather">
          <use href="https://admin.pixelstrap.net/edmin/assets/svg/feather-icons/dist/feather-sprite.svg#arrow-up"></use>
        </svg>
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
                    <div className="login-social-title">
                      <h6>Or Sign in with </h6>
                    </div>
                    <div className="form-group">
                      <ul className="login-social">
                        <li>
                          <a href="https://www.linkedin.com/" target="_blank">
                            <i className="icon-linkedin"></i>
                          </a>
                        </li>
                        <li>
                          <a href="https://twitter.com/" target="_blank">
                            <i className="icon-twitter"></i>
                          </a>
                        </li>
                        <li>
                          <a href="https://www.facebook.com/" target="_blank">
                            <i className="icon-facebook"></i>
                          </a>
                        </li>
                        <li>
                          <a href="https://www.instagram.com/" target="_blank">
                            <i className="icon-instagram"></i>
                          </a>
                        </li>
                      </ul>
                    </div>
                    <p className="mt-4 mb-0 text-center">
                      Don't have account?
                      <a className="ms-2" href="sign-up.html">
                        Create Account
                      </a>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <script src="../assets/js/vendors/jquery/dist/jquery.min.js"></script>
        <script src="../assets/js/vendors/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
        <script src="../assets/js/config.js"></script>
        <script src="../assets/js/password.js"></script>
        <script src="../assets/js/script.js"></script>
      </div>
    </div>
  );
}

export default App;
