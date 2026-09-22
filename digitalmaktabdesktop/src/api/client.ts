import axios from "axios";

const API_BASE_URL = "http://192.168.8.142:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem("user");
  if (raw) {
    const user = JSON.parse(raw);
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

export interface User {
  token: string;
  role: string;
  school: any;
  teacher: any;
  student: any;
  rootUser: any;
}

export async function login(
  email: string,
  password: string
): Promise<User> {
  const res = await apiClient.post<User>("/auth", { email, password });
  return res.data;
}

export default apiClient;
