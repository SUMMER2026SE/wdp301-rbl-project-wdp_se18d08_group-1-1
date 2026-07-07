import { apiClient } from './client';

export const subscriptionsService = {
  createPayment: (data: unknown) => apiClient.post('/subscriptions/create-payment', data),
  verifyPayment: (data: unknown) => apiClient.post('/subscriptions/verify-payment', data),
  payWithWallet: (data: unknown) => apiClient.post('/subscriptions/pay-with-wallet', data),
};
