import axios from "axios";

import { getCurrentLanguage, getUser } from "../helper/helper";
import { User } from "../models/User";

let apiClient = axios.create({
  baseURL: "",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getCurrentLanguage(),
  },
});

apiClient.interceptors.request.use(function (config) {
  config.headers["Accept-Language"] = getCurrentLanguage();
  const user: User | null = getUser();
  if (user != null && user.token && user.token.length > 0) {
    config.headers.Authorization = "Bearer ".concat(user.token);
  }
  return config;
});

export const getCancellationToken = () => {
  return axios.CancelToken.source();
};

export const getIsCancel = () => {
  return axios.isCancel;
};

export default apiClient;
