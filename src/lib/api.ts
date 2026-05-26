import axios from "axios";

let getAuthStore: () => {
  token: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
};

// 순환 참조 방지를 위해 런타임에 store를 가져옴
export function setAuthStoreGetter(fn: typeof getAuthStore) {
  getAuthStore = fn;
}

export const AuthApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export const ImageApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_IMAGE_API_URL,
  withCredentials: true,
});

export const MosaicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_MOSAIC_API_URL,
});

AuthApi.interceptors.request.use((config) => {
  const token = getAuthStore?.().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AuthApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await AuthApi.get("/api/auth/refresh");
        const { accessToken, email } = response.data;

        getAuthStore?.().login(accessToken, email);
        AuthApi.defaults.headers.common["Authorization"] =
          `Bearer ${accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        return AuthApi(originalRequest);
      } catch {
        getAuthStore?.().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const PostLogin = async (email: string, password: string) => {
  const response = await AuthApi.post("/api/auth/login", { email, password });
  return response.data as {
    resultCode: string;
    resultMessage: string;
    data: { accessToken: string; email: string };
  };
};
