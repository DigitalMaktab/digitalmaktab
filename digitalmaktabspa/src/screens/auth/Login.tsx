import React, { useContext } from "react";
import AppButton from "../../components/AppButton";
import FeatherIcon from "feather-icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppForm from "../../components/form/AppForm";
import * as Yup from "yup";
import AppFormInput from "../../components/form/AppFormInput";
import useAuth from "../../hooks/useAuth";
import { ResponseResult } from "../../dtos/ResultEnum";
import { AuthContext } from "../../helper/auth/AuthProvider";
import { UserRole } from "../../models/UserRole";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { login: authContextLogin } = useContext(AuthContext)!;

  const { login } = useAuth();

  const initialValues = {
    email: "",
    password: "",
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .required(t("auth.email.validation.required"))
      .email(t("auth.email.validation.invalid")),
    password: Yup.string().required(t("auth.password.validation.required")),
  });

  const onSubmit = async (values: typeof initialValues) => {
    const result = await login(values.email, values.password);
    if (result.status === ResponseResult.SUCCESS) {
      if (result.data != null) {
        authContextLogin(result.data);
        const role: UserRole = result.data.user.userRole;
        switch (role) {
          case UserRole.STUDENT:
            navigate("/student-dashboard");
            break;
          case UserRole.ADMIN:
            navigate("/home");
            break;
          case UserRole.TEACHER:
            navigate("/teacher-dashboard");
            break;
          case UserRole.ROOT_USER:
            navigate("/dashboard");
            break;
          default:
            navigate("/error");
        }
      }
    }
  };

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
                  <AppForm
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={onSubmit}
                  >
                    <h2 className="text-center">
                      {t("auth.login.headerText")}
                    </h2>
                    <p className="text-center">{t("auth.login.headerLabel")}</p>
                    <AppFormInput
                      name="email"
                      label={t("auth.email.label")}
                      placeholder={t("auth.email.placeholder")}
                    />

                    <AppFormInput
                      name="password"
                      type="password"
                      label={t("auth.password.label")}
                      placeholder={t("auth.password.placeholder")}
                    />
                    <div className="form-group mb-0 checkbox-checked">
                      <div className="form-check checkbox-solid-info">
                        <input
                          className="form-check-input"
                          id="solid6"
                          type="checkbox"
                        />
                        <label className="form-check-label">
                          {t("auth.login.rememberPassword")}
                        </label>
                      </div>
                      <a className="link-two" href="forget-password.html">
                        {t("auth.login.forgotPassword")}
                      </a>
                      <AppButton
                        label={t("auth.login.login")}
                        type="submit"
                        disabled={false}
                      />
                    </div>
                    <p className="mt-4 mb-0 text-center">
                      {t("auth.login.dontHaveAccount")}
                      <Link className="ms-2" to="/signup">
                        {t("auth.login.createAccount")}
                      </Link>
                    </p>
                  </AppForm>
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
