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

  getTopUpStatus(orderCode: string | number) {
    return apiClient.get<APIResponse>(`/wallet/top-up/${orderCode}/status`);
  }

  getTransactions(params?: { page?: number; limit?: number }) {
    return apiClient.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', {
      params,
    });
  }
}

export const walletService = new WalletService();
