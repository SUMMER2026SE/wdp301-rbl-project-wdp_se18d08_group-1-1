import type { APIResponse, PaginatedResponse } from '@/types/api';
import type { NotificationType, UserNotification } from '@/types/models';

import { apiClient } from './client';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export interface StaffNotificationInput {
  title: string;
  content: string;
  type: NotificationType;
  priority: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  targetType: 'SINGLE_USER' | 'MULTI_USER' | 'ALL_USERS';
  targetUsers: string[];
}

export const notificationsService = {
  getNotifications: (params: NotificationQuery = {}) =>
    apiClient.get<PaginatedResponse<UserNotification>>('/notifications', { params: { limit: 20, ...params } }),
  getUnreadCount: () => apiClient.get<APIResponse<{ count: number }>>('/notifications/unread-count'),
  markAsRead: (id: string) => apiClient.put<APIResponse>(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put<APIResponse>('/notifications/read-all'),
  deleteNotification: (id: string) => apiClient.delete<APIResponse>(`/notifications/${id}`),
  getStaffHistory: (params: NotificationQuery & { priority?: string; search?: string } = {}) =>
    apiClient.get<PaginatedResponse<UserNotification>>('/notifications/admin/history', { params: { limit: 30, ...params } }),
  createStaffNotification: (data: StaffNotificationInput) =>
    apiClient.post<APIResponse<UserNotification>>('/notifications', data),
  revokeStaffNotification: (id: string) => apiClient.put<APIResponse>(`/notifications/${id}/revoke`),
};
