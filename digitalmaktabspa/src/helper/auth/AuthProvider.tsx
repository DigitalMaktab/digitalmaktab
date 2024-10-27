import React, { useState, createContext, useEffect } from "react";
import { Properties } from "../../components/properties/Properties";
import { User } from "../../models/User";
import { authenticated, getUser, removeUser, saveUser } from "../helper";
import { UserRole } from "../../models/UserRole";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (user: User) => void;
  logout: () => void;
}

const initialValue = {
  isAuthenticated: false,
  userRole: null,
  login: () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(initialValue);

const AuthProvider: React.FC<Properties> = ({ children }) => {
  const storedUser = getUser();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!storedUser);
  const [userRole, setUserRole] = useState<UserRole | null>(
    storedUser ? storedUser.user.userRole : UserRole.UNKNOWN
  );

  const login = (user: User) => {
    setIsAuthenticated(true);
    saveUser(user);
    setUserRole(user.user.userRole as UserRole); // Set role on login
  };

  const logout = () => {
    removeUser();
    setIsAuthenticated(false);
    setUserRole(UserRole.UNKNOWN);
  };

  useEffect(() => {
    if (storedUser) {
      setIsAuthenticated(true);
      setUserRole(storedUser.user.userRole);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, AuthContext };
