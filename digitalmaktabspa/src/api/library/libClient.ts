// libClient.ts
import axios from "axios";
import { getFromCache, saveToCache } from "../../cache/cache";

const API_BASE_URL = "https://openlibrary.org";

// Configure axios instance for libClient
const libClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to handle caching and fallback on errors
libClient.interceptors.response.use(
  async (response) => {
    const cacheKey =
      response.config.url + JSON.stringify(response.config.params);
    await saveToCache(cacheKey, response.data); // Save response data to cache
    return response;
  },
  async (error) => {
    const cacheKey = error.config?.url + JSON.stringify(error.config.params);
    const cachedResponse = await getFromCache(cacheKey);

    if (cachedResponse) {
      // Return cached data if available on network error
      return Promise.resolve({
        ...error.config,
        data: cachedResponse,
        status: 200,
        cached: true,
      });
    }
    return Promise.reject(error); // Reject if no cache is available
  }
);

export default libClient;
