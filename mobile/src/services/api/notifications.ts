import type { APIResponse, PaginatedResponse } from '@/types/api';
import type { NotificationType, UserNotification } from '@/types/models';

import { apiClient } from './client';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export const notificationsService = {
  getNotifications: (params: NotificationQuery = {}) =>
    apiClient.get<PaginatedResponse<UserNotification>>('/notifications', { params: { limit: 20, ...params } }),
  getUnreadCount: () => apiClient.get<APIResponse<{ count: number }>>('/notifications/unread-count'),
  markAsRead: (id: string) => apiClient.put<APIResponse>(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put<APIResponse>('/notifications/read-all'),
  deleteNotification: (id: string) => apiClient.delete<APIResponse>(`/notifications/${id}`),
};
