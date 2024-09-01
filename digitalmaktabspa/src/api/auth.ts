import apiClient from "./client";

const login = (email: string, password: string) =>
  apiClient.post("", { email, password });

const auth = {
  login,
};

export default auth;
