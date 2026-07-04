import axiosClient from './axiosClient';

export type HealthCheckResponse = {
  status?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
};

const HEALTH_ENDPOINT = '/health';

export const testBackendConnection = async () => {
  // Backend currently exposes GET /api/health.
  // Because EXPO_PUBLIC_API_URL ends with /api, this calls /health.
  // Change HEALTH_ENDPOINT if your backend health route changes.
  const response = await axiosClient.get<HealthCheckResponse>(HEALTH_ENDPOINT);

  return response.data;
};
