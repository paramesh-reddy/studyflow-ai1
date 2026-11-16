import axios from 'axios';

const ACCESS_KEY = 'studyflow_access_token';
const REFRESH_KEY = 'studyflow_refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !original?.url?.includes('/auth/login') &&
      !original?.url?.includes('/auth/register') &&
      !original?.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = axios
            .post('/api/v1/auth/refresh', { refreshToken })
            .then((res) => {
              const { accessToken, refreshToken: nextRefresh } = res.data;
              tokenStorage.setTokens(accessToken, nextRefresh);
              return accessToken as string;
            })
            .catch(() => {
              tokenStorage.clear();
              return null;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const nextAccess = await refreshPromise;
        if (nextAccess) {
          original.headers.Authorization = `Bearer ${nextAccess}`;
          return api(original);
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.error?.message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
