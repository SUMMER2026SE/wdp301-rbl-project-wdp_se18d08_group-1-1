/**
 * Notification API service — all API calls related to notifications.
 */

import { apiFetch } from './api';

/** GET /api/notifications — paginated, filtered */
export const getNotifications = ({ page = 1, limit = 20, type, isRead, search } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (type) params.set('type', type);
  if (isRead !== undefined && isRead !== null && isRead !== '') params.set('isRead', isRead);
  if (search) params.set('search', search);

  return apiFetch(`/notifications?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

/** GET /api/notifications/unread-count */
export const getUnreadCount = () =>
  apiFetch('/notifications/unread-count', {
    method: 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

/** PUT /api/notifications/:id/read */
export const markAsRead = (id) =>
  apiFetch(`/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

/** PUT /api/notifications/read-all */
export const markAllAsRead = () =>
  apiFetch('/notifications/read-all', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

/** DELETE /api/notifications/:id */
export const deleteNotification = (id) =>
  apiFetch(`/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });

// ── Admin/Staff endpoints ──

/** POST /api/notifications */
export const createNotification = (data) =>
  apiFetch('/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    body: JSON.stringify(data),
  });

/** GET /api/notifications/admin/history */
export const getAdminHistory = ({ page = 1, limit = 20, type } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (type) params.set('type', type);

  return apiFetch(`/notifications/admin/history?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};

/** PUT /api/notifications/:id/revoke */
export const revokeNotification = (id) =>
  apiFetch(`/notifications/${id}/revoke`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
