import axios from "axios";
import { getCurrentLanguage, getUser } from "../helper/helper";
import { User } from "../models/User";
import settings from "../config/settings";
import { getFromCache, saveToCache } from "../cache/cache";

let apiClient = axios.create({
  baseURL: settings.dev.apiUrl,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getCurrentLanguage(),
  },
});

apiClient.interceptors.request.use(async (config) => {
  config.headers["Accept-Language"] = getCurrentLanguage();
  const user: User | null = getUser();
  if (user != null && user.token && user.token.length > 0) {
    config.headers.Authorization = "Bearer ".concat(user.token);
  }

  // Skip cache for requests containing 'login' in the URL
  if (config.url?.includes("login")) {
    return config;
  }

  // Create a cache key based on the URL and params
  const cacheKey = config.url + JSON.stringify(config.params);
  const cachedResponse = await getFromCache(cacheKey);

  if (cachedResponse) {
    // If cached data exists, fulfill the request with cached data and skip network call
    return Promise.resolve({
      ...config,
      data: cachedResponse,
      cached: true, // Custom flag to indicate cached response
    });
  }
  return config;
});

// Handle responses to store in cache or fetch from cache in case of errors
apiClient.interceptors.response.use(
  async (response) => {
    // Skip cache storage for responses with 'login' in the URL
    if (!response.config.url?.includes("auth")) {
      const cacheKey =
        response.config.url + JSON.stringify(response.config.params);
      await saveToCache(cacheKey, response.data);
    }
    return response;
  },
  async (error) => {
    // Skip cache retrieval for errors with 'login' in the URL
    if (error.config?.url?.includes("auth")) {
      return Promise.reject(error);
    }

    // Try to retrieve data from the cache if the network request fails
    const cacheKey = error.config?.url + JSON.stringify(error.config.params);
    const cachedResponse = await getFromCache(cacheKey);

    if (cachedResponse) {
      // Return cached data if available in case of a network error
      return Promise.resolve({
        ...error.config,
        data: cachedResponse,
        status: 200,
        cached: true,
      });
    }
    // If no cache and network fails, reject the error
    return Promise.reject(error);
  }
);

export const getCancellationToken = () => {
  return axios.CancelToken.source();
};

export const getIsCancel = () => {
  return axios.isCancel;
};

export default apiClient;
