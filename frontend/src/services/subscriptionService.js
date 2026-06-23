import { apiFetch } from './api';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

export const getTicketPackages = async () => {
  return apiFetch('/ticket-packages/active', {
    method: 'GET',
    headers: authHeader(),
  });
};

export const createSubscriptionPayment = async (packageId, slots) => {
  return apiFetch('/subscriptions/create-payment', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ packageId, slots }),
  });
};

export const verifySubscriptionPayment = async (orderCode) => {
  return apiFetch('/subscriptions/verify-payment', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ orderCode }),
  });
};

export const paySubscriptionWithWallet = async (packageId, slots) => {
  return apiFetch('/subscriptions/pay-with-wallet', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ packageId, slots }),
  });
};
