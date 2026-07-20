import { apiClient } from './client';
import type { APIResponse } from '@/types/api';
import type {
  CreateSubscriptionPaymentRequest,
  CreateSubscriptionPaymentResponse,
  MembershipStatus,
  SubscriptionRenewalQuote,
  SubscriptionRenewalResult,
  SubscriptionPackage,
} from '@/types/subscription.types';

export const subscriptionsService = {
  getPackages: () => apiClient.get<APIResponse<SubscriptionPackage[]>>('/ticket-packages/active'),
  getMembership: () => apiClient.get<APIResponse<MembershipStatus>>('/users/membership'),
  getMembershipQr: (subscriptionId: string) =>
    apiClient.get<
      APIResponse<{
        available: boolean;
        membershipStatus: string;
        expireAt: string;
        payload: string | null;
        reason: string | null;
      }>
    >(`/subscriptions/${subscriptionId}/qr`),
  createPayment: (data: CreateSubscriptionPaymentRequest) =>
    apiClient.post<CreateSubscriptionPaymentResponse>('/subscriptions/payment', data),
  verifyPayment: (data: { orderCode: number }) =>
    apiClient.post<APIResponse>('/subscriptions/verify-payment', data),
  payWithWallet: (data: CreateSubscriptionPaymentRequest) =>
    apiClient.post<APIResponse>('/subscriptions/pay-with-wallet', data),
  getRenewalQuote: (subscriptionId: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalQuote>>(
      `/subscriptions/${subscriptionId}/renew/quote`,
    ),
  renewWithWallet: (subscriptionId: string, idempotencyKey: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalResult>>(
      `/subscriptions/${subscriptionId}/renew/pay-with-wallet`,
      { idempotencyKey },
    ),
  createRenewalPayment: (subscriptionId: string, idempotencyKey: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalResult>>(
      `/subscriptions/${subscriptionId}/renew/create-payment`,
      { idempotencyKey },
    ),
  verifyRenewalPayment: (orderCode: number) =>
    apiClient.post<APIResponse<SubscriptionRenewalResult>>(
      '/subscriptions/renew/verify-payment',
      { orderCode },
    ),
};
