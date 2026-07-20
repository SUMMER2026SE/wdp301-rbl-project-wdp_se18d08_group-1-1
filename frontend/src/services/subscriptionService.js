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

export const getMembership = async () => {
  return apiFetch('/subscriptions/membership', {
    method: 'GET',
    headers: authHeader(),
  });
};

export const getMembershipStatus = async () =>
  apiFetch('/subscriptions/membership', {
    method: 'GET',
    headers: authHeader(),
  });

export const getMembershipQr = async (subscriptionId) =>
  apiFetch(`/subscriptions/${subscriptionId}/qr`, {
    method: 'GET',
    headers: authHeader(),
  });

export const getRenewalQuote = async (subscriptionId) =>
  apiFetch(`/subscriptions/${subscriptionId}/renew/quote`, {
    method: 'POST',
    headers: authHeader(),
  });

export const renewSubscriptionWithWallet = async (subscriptionId, idempotencyKey) =>
  apiFetch(`/subscriptions/${subscriptionId}/renew/pay-with-wallet`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ idempotencyKey }),
  });

export const createRenewalPayment = async (subscriptionId, idempotencyKey) =>
  apiFetch(`/subscriptions/${subscriptionId}/renew/create-payment`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ idempotencyKey }),
  });

export const verifyRenewalPayment = async (orderCode) =>
  apiFetch('/subscriptions/renew/verify-payment', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ orderCode: Number(orderCode) }),
  });
