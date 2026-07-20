import { apiClient } from './client';
import type { APIResponse } from '@/types/api';
import type {
  CreateSubscriptionPaymentRequest,
  CreateSubscriptionPaymentResponse,
  MembershipStatus,
  SubscriptionRenewalQuote,
  SubscriptionRenewalResult,
  SubscriptionPackage,
  MembershipEntitlementTransfer,
} from '@/types/subscription.types';
import type { SignedQrResponse } from '@/types/qr.types';

export const subscriptionsService = {
  getPackages: () => apiClient.get<APIResponse<SubscriptionPackage[]>>('/ticket-packages/active'),
  getMembership: () => apiClient.get<APIResponse<MembershipStatus>>('/users/membership'),
  getMembershipQr: () => apiClient.get<APIResponse<SignedQrResponse>>('/subscriptions/membership/qr'),
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
  getEntitlementRenewalQuote: (entitlementId: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalQuote>>(
      `/subscriptions/entitlements/${entitlementId}/renew/quote`,
    ),
  renewEntitlementWithWallet: (entitlementId: string, idempotencyKey: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalResult>>(
      `/subscriptions/entitlements/${entitlementId}/renew/pay-with-wallet`,
      { idempotencyKey },
    ),
  createEntitlementRenewalPayment: (entitlementId: string, idempotencyKey: string) =>
    apiClient.post<APIResponse<SubscriptionRenewalResult>>(
      `/subscriptions/entitlements/${entitlementId}/renew/create-payment`,
      { idempotencyKey },
    ),
  createEntitlementTransfer: (
    entitlementId: string,
    data: { toUserEmail: string; askingPrice: number; reason: string },
  ) =>
    apiClient.post<APIResponse<MembershipEntitlementTransfer>>(
      `/customer/membership-entitlements/${entitlementId}/transfers`,
      data,
    ),
  getEntitlementTransfers: () =>
    apiClient.get<APIResponse<MembershipEntitlementTransfer[]>>(
      '/customer/membership-entitlement-transfers',
    ),
  acceptEntitlementTransfer: (transferId: string) =>
    apiClient.put<APIResponse<MembershipEntitlementTransfer>>(
      `/customer/membership-entitlement-transfers/${transferId}/accept`,
    ),
  rejectEntitlementTransfer: (transferId: string) =>
    apiClient.put<APIResponse<MembershipEntitlementTransfer>>(
      `/customer/membership-entitlement-transfers/${transferId}/reject`,
      { reason: 'Declined by customer' },
    ),
  settleEntitlementTransfer: (transferId: string) =>
    apiClient.post<APIResponse<MembershipEntitlementTransfer>>(
      `/customer/membership-entitlement-transfers/${transferId}/settle-wallet`,
    ),
};
