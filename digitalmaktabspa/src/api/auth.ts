import apiClient from "./client";

const login = (email: string, password: string) =>
  apiClient.post("/auth", { email, password });

const auth = {
  login,
};

export default auth;
