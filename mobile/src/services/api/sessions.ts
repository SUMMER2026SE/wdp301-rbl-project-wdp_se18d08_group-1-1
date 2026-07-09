import { apiClient } from './client';

export const sessionsService = {
  getActiveParkingStatus: () => apiClient.get('/sessions/active-status'),
  getMyHistory: () => apiClient.get('/sessions/my-history'),
};
