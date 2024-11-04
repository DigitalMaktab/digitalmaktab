import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { Outlet, useNavigate } from "react-router-dom";
import { UserRole } from "../../models/UserRole";

const Auth: React.FC = () => {
  const { isAuthenticated, userRole } = useContext(AuthContext)!;
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsRedirecting(true); // Start redirecting
      // Redirect authenticated users to their respective dashboards
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
    }
  }, [isAuthenticated, userRole, navigate]);

  // Return null if redirecting to avoid rendering the Outlet
  if (isAuthenticated && isRedirecting) {
    return null;
  }

  // Render the children if not authenticated or redirecting has completed
  return <Outlet />;
};

export default Auth;
