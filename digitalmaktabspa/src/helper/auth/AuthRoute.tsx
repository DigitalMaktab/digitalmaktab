import React, { useContext, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import { useNavigate } from "react-router-dom";
import { UserRole } from "../../models/UserRole";

const AuthRoute = ({ component: Component, ...rest }: any) => {
  const { isAuthenticated, userRole } = useContext(AuthContext)!;

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      switch (userRole) {
        case UserRole.STUDENT:
          navigate("/student-dashboard");
          break;
        case UserRole.ADMIN:
          navigate("/admin-dashboard");
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
  }, [isAuthenticated, userRole, navigate]);
  return <div></div>;
};

export default AuthRoute;