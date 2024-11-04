import React, { useContext, useEffect } from "react";
import { AuthContext } from "./AuthProvider";
import { Outlet, useNavigate } from "react-router-dom";
import { UserRole } from "../../models/UserRole";

interface AuthRouteProps {
  requiredRole?: UserRole;
}

const AuthRoute: React.FC<AuthRouteProps> = ({ requiredRole }) => {
  const { isAuthenticated, userRole } = useContext(AuthContext)!;
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login"); // Redirect to login if not authenticated
    } else if (requiredRole && userRole !== requiredRole) {
      navigate("/unauthorized"); // Redirect if the user lacks the required role
    }
  }, [isAuthenticated, userRole, navigate, requiredRole]);

  return isAuthenticated && (!requiredRole || userRole === requiredRole) ? (
    <Outlet />
  ) : null;
};

export default AuthRoute;
