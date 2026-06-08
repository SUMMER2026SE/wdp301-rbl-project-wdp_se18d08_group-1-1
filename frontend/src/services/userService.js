import { apiFetch } from './api';

/**
 * @desc Search users by username or email
 * @param {string} query
 */
export const searchUsers = (query = '') => {
  const params = new URLSearchParams();
  if (query) params.set('q', query);

  return apiFetch(`/admin/users/search?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
};
