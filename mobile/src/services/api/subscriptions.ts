import { apiClient } from './client';
import type { APIResponse } from '@/types/api';
import type {
  CreateSubscriptionPaymentRequest,
  CreateSubscriptionPaymentResponse,
  MembershipStatus,
  SubscriptionPackage,
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
};
