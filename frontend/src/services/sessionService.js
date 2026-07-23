import { apiFetch } from './api.js';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

export const getAllSessions = () => apiFetch('/sessions', { method: 'GET', headers: authHeader() });
export const getActiveSessions = () => apiFetch('/sessions/active-status', { method: 'GET', headers: authHeader() });
