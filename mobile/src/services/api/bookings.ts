import { apiClient } from './client';
import type { CreateBookingRequest } from '@/types/api.types';

export const bookingsService = {
  getAvailableSlots: (params?: { startTime?: string; endTime?: string }) =>
    apiClient.get('/bookings/available-slots', { params }),
  getMyBookings: () => apiClient.get('/bookings/my'),
  createBooking: (data: CreateBookingRequest) => apiClient.post('/bookings', data),
  checkInBooking: (bookingId: string) => apiClient.post(`/bookings/${bookingId}/check-in`),
  checkOutBooking: (bookingId: string) => apiClient.post(`/bookings/${bookingId}/check-out`),
};
