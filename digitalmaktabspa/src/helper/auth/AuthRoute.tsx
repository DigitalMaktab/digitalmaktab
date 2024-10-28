import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { Outlet, useNavigate } from "react-router-dom";
import { UserRole } from "../../models/UserRole";

const AuthRoute = ({ component: Component, ...rest }: any) => {
  const { isAuthenticated, userRole } = useContext(AuthContext)!;
  const [hasNavigated, setHasNavigated] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (!hasNavigated && userRole !== undefined && userRole !== null) {
      switch (userRole) {
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
          break;
      }
      setHasNavigated(true);
    }
  }, [isAuthenticated, userRole, navigate, hasNavigated]);
  return <Outlet />;
};

export default AuthRoute;
