import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL } from '@/config/env';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { AuthenticationError, NetworkError, ValidationError } from '@/types/errors';

type QueuedRequest = (token: string) => void;

export type NormalizedApiError = Error & {
  status?: number;
  code?: string;
  data?: unknown;
};

const extractErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.message === 'string') {
      return record.message;
    }

    if (typeof record.error === 'string') {
      return record.error;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const firstError = record.errors[0] as Record<string, unknown>;
      if (typeof firstError.message === 'string') {
        return firstError.message;
      }
    }
  }

  return fallback;
};

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: QueuedRequest[] = [];
  private logoutHandler?: () => void;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setLogoutHandler(handler: () => void) {
    this.logoutHandler = handler;
  }

  get instance() {
    return this.client;
  }

  get<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T, T>(url, config);
  }

  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T, T>(url, data, config);
  }

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T, T>(url, data, config);
  }

  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.patch<T, T>(url, data, config);
  }

  delete<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T, T>(url, config);
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const token = await tokenStorage.getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }

      if (__DEV__) {
        console.log('[API Request]', config.method?.toUpperCase(), config.url);
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError) => {
        const originalRequest = error.config as
          | (InternalAxiosRequestConfig & { _retry?: boolean })
          | undefined;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshQueue.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await tokenStorage.getRefreshToken();

            if (!refreshToken) {
              throw new AuthenticationError('No refresh token available.');
            }

            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh-token`,
              { refreshToken },
              { timeout: 30000 },
            );
            const accessToken = response.data?.data?.accessToken;

            if (!accessToken) {
              throw new AuthenticationError('Refresh response did not include access token.');
            }

            await tokenStorage.saveAccessToken(accessToken);
            this.refreshQueue.forEach((callback) => callback(accessToken));
            this.refreshQueue = [];
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('[API] Refresh token failed or original request got 401. Logging out. URL was:', originalRequest?.url);
            this.refreshQueue = [];
            await tokenStorage.clearTokens();
            this.logoutHandler?.();

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        const status = error.response?.status;
        const message = extractErrorMessage(
          error.response?.data,
          error.message || 'Request failed',
        );

        if (!error.response) {
          return Promise.reject(new NetworkError(message));
        }

        if (status === 400) {
          return Promise.reject(new ValidationError(message));
        }

        const normalizedError = new Error(message) as NormalizedApiError;
        normalizedError.status = status;
        normalizedError.code = error.code;
        normalizedError.data = error.response?.data;

        return Promise.reject(normalizedError);
      },
    );
  }
}

export const apiClient = new APIClient();
