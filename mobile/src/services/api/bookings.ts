import { apiClient } from './client';
import type { CreateBookingRequest } from '@/types/api.types';

export const bookingsService = {
  getAvailableSlots: (params?: { startTime?: string; endTime?: string }) =>
    apiClient.get('/bookings/available-slots', { params }),
  getMyBookings: () => apiClient.get('/bookings/my'),
  getBookingQr: (bookingId: string) => apiClient.get(`/bookings/${bookingId}/qr`),
  createBooking: (data: CreateBookingRequest) => apiClient.post('/bookings', data),
  checkInBooking: (bookingId: string) => apiClient.post(`/bookings/${bookingId}/check-in`),
  checkOutBooking: (bookingId: string) => apiClient.post(`/bookings/${bookingId}/check-out`),
};
