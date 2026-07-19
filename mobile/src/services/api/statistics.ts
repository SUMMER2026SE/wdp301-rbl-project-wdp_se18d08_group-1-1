import type { APIResponse } from '@/types/api';
import { apiClient } from './client';

export interface CustomerBookingStatistics {
  period: { startDate: string | null; endDate: string };
  operational: {
    totalBookings: number;
    completedBookings: number;
    activeBookings: number;
    cancelledBookings: number;
    expiredBookings: number;
    completionRate: number;
    scheduledHours: number;
    bookingValue: number;
  };
  money: {
    walletBookingCharges: number;
    walletBookingRefunds: number;
    walletNetBookingSpend: number;
    walletRefundCount: number;
    financialCoverage: 'complete' | 'partial' | 'unavailable';
  };
}

export interface AdminSubscriptionStatistics {
  summary: {
    sold: number;
    active: number;
    pending: number;
    expired: number;
    expiringWithin7Days: number;
    grossAmount: number;
    renewalCount: number;
    renewalRate: number;
    activeReservedSlots: number;
  };
}

export const statisticsService = {
  getCustomerBookings: (range: '7d' | '30d' | 'month' | 'all' = '30d') =>
    apiClient.get<APIResponse<CustomerBookingStatistics>>('/statistics/customer/bookings', {
      params: { range },
    }),
  getAdminSubscriptions: (range: '7d' | '30d' | 'month' | 'all' = '30d') =>
    apiClient.get<APIResponse<AdminSubscriptionStatistics>>('/statistics/admin/subscriptions', {
      params: { range },
    }),
};
