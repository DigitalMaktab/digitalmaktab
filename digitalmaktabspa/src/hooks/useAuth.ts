import { useCallback } from "react";
import useApiRequests from "./useApiRequests";

import auth from "../api/auth";
import { User } from "../models/User";

const useAuth = () => {
  const { data, status, execute: executeAuthApi } = useApiRequests<User>();

  const login = useCallback(
    (email: string, password: string) => {
      return executeAuthApi(() => auth.login(email, password));
    },
    [executeAuthApi]
  );

  return {
    data,
    status,
    login,
  };
};

export default useAuth;
