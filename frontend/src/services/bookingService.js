import { apiFetch } from './api';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

export const getAvailableBookingSlots = ({ startTime, endTime }) => {
  const query = new URLSearchParams({ startTime, endTime }).toString();

  return apiFetch(`/bookings/available-slots?${query}`, {
    method: 'GET',
    headers: authHeader(),
  });
};

export const createBooking = (payload) =>
  apiFetch('/bookings', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

export const getMyBookings = () =>
  apiFetch('/bookings/my', {
    method: 'GET',
    headers: authHeader(),
  });

export const checkInBooking = (bookingId) =>
  apiFetch(`/bookings/${bookingId}/check-in`, {
    method: 'POST',
    headers: authHeader(),
  });

export const checkOutBooking = (bookingId) =>
  apiFetch(`/bookings/${bookingId}/check-out`, {
    method: 'POST',
    headers: authHeader(),
  });
