import { apiClient } from './client';

export const notificationsService = {
  getNotifications: () => apiClient.get('/notifications'),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markAllAsRead: () => apiClient.put('/notifications/read-all'),
};
