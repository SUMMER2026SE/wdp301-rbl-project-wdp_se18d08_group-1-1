import { apiFetch } from './api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

export const getWalletInfo = () =>
  apiFetch('/wallet', {
    method: 'GET',
    headers: getAuthHeaders(),
  });

export const createTopUpUrl = (amount) =>
  apiFetch('/wallet/top-up', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount: Number(amount) }),
  });

export const getTopUpStatus = (orderCode, cancel = false) => {
  const query = cancel ? '?cancel=true' : '';
  return apiFetch(`/wallet/top-up/${orderCode}/status${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
};

export const getTransactionsHistory = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/wallet/transactions?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
};