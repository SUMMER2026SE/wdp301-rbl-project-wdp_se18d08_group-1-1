import { apiClient } from './client';

export const sessionsService = {
  getActiveParkingStatus: () => apiClient.get('/sessions/active-status'),
  getAllSessions: () => apiClient.get('/sessions'),
  getMyHistory: () => apiClient.get('/sessions/my-history'),
};
