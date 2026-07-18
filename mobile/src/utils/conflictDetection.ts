import type { Booking } from '@/types/booking.types';

export type ConflictType = 'slot_unavailable' | 'vehicle_booking' | 'vehicle_session' | 'vip_restriction';

export interface ConflictResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  message?: string;
  details?: unknown;
}

export const checkVehicleConflict = (
  licensePlate: string,
  requestedStart: Date,
  requestedEnd: Date,
  existingBookings: Booking[],
): ConflictResult => {
  const overlapping = existingBookings.find((booking) => {
    if (booking.licensePlate !== licensePlate) {
      return false;
    }

    if (!['confirmed', 'active'].includes(booking.status)) {
      return false;
    }

    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    return bookingStart < requestedEnd && bookingEnd > requestedStart;
  });

  if (overlapping) {
    return {
      hasConflict: true,
      conflictType: 'vehicle_booking',
      message: 'This vehicle already has another booking during the selected time range.',
      details: overlapping,
    };
  }

  return { hasConflict: false };
};
