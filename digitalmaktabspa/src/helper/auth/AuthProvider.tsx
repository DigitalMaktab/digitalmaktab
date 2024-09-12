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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    authenticated()
  );
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [user, setUser] = useState<User | null>(getUser());

  const login = (user: User) => {
    setIsAuthenticated(true);
    saveUser(user);
    setUser(user);
  };

  const logout = () => {
    removeUser();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const role = user?.user.userRole;
      setUserRole(role || null);
    } else {
      setUserRole(null);
    }
  }, [isAuthenticated, user?.user.userRole]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, AuthContext };
