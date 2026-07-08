import type { APIResponse, PaginatedResponse } from '@/types/api';
import type { CreateTopUpRequest, TopUpResponse, Wallet, WalletTransaction } from '@/types/models';

import { apiClient } from './client';

class WalletService {
  getWallet() {
    return apiClient.get<APIResponse<Wallet>>('/wallet');
  }

  createTopUp(data: CreateTopUpRequest) {
    return apiClient.post<TopUpResponse>('/wallet/top-up', data);
  }

  getTopUpStatus(orderCode: string | number, cancel = false) {
    return apiClient.get<
      APIResponse<{
        transactionId: string;
        orderCode: number;
        amount: number;
        status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
        payosStatus?: string | null;
      }>
    >(`/wallet/top-up/${orderCode}/status`, {
      params: cancel ? { cancel: true } : undefined,
    });
  }

  getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: 'TOP_UP' | 'PAYMENT' | 'REFUND';
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  }) {
    return apiClient.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', {
      params,
    });
  }
}

export const walletService = new WalletService();
