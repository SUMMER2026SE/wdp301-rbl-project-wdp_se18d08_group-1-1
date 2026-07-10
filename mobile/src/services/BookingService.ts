import { apiClient } from '@/services/api/client';
import type {
  AvailableSlotsData,
  CheckInBookingResponse,
  CheckOutBookingResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  GetAvailableSlotsResponse,
  GetMyBookingsResponse,
} from '@/types/api.types';
import type { AvailableSlot, Booking } from '@/types/booking.types';

class BookingService {
  getAvailableSlots(startTime: Date, endTime: Date) {
    return apiClient.get<GetAvailableSlotsResponse>('/bookings/available-slots', {
      params: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });
  }

  createBooking(data: CreateBookingRequest) {
    return apiClient.post<CreateBookingResponse>('/bookings', data);
  }

  getMyBookings() {
    return apiClient.get<GetMyBookingsResponse>('/bookings/my');
  }

  getBookingById(bookingId: string) {
    return apiClient.get<CreateBookingResponse>(`/bookings/${bookingId}`);
  }

  checkInBooking(bookingId: string) {
    return apiClient.post<CheckInBookingResponse>(`/bookings/${bookingId}/check-in`);
  }

  checkOutBooking(bookingId: string) {
    return apiClient.post<CheckOutBookingResponse>(`/bookings/${bookingId}/check-out`);
  }

  normalizeBookings(response: GetMyBookingsResponse | { data?: Booking[] }) {
    return response.data || [];
  }

  normalizeAvailableSlots(response: GetAvailableSlotsResponse | { data?: AvailableSlot[] | AvailableSlotsData }) {
    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object' && Array.isArray(data.slots)) {
      return data.slots;
    }

    return [];
  }
}

export const bookingService = new BookingService();
export default bookingService;
