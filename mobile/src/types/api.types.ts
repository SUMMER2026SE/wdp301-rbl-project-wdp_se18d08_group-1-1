import type { AvailableSlot, Booking, Service, Session } from './booking.types';
import type { APIResponse, PaginatedResponse } from './api';

export interface GetAvailableSlotsRequest {
  startTime: string;
  endTime: string;
}

export interface AvailableSlotsData {
  startTime?: string;
  endTime?: string;
  count?: number;
  slots?: AvailableSlot[];
}

export interface GetAvailableSlotsResponse extends APIResponse<AvailableSlot[] | AvailableSlotsData> {
  count?: number;
}

export interface CreateBookingRequest {
  startTime: string;
  endTime: string;
  floorId: string;
  slotCode: string;
  vehicleId: string;
  serviceIds?: string[];
}

export interface CreateBookingResponse extends APIResponse<Booking> {}

export interface BookingConflictResponse {
  success: false;
  message: string;
  data?: {
    conflictType?: string;
    existingBooking?: Booking;
    existingSession?: Session;
    reservedSlots?: AvailableSlot[];
  };
}

export interface GetMyBookingsResponse extends PaginatedResponse<Booking> {
  count?: number;
}

export interface CheckInBookingResponse
  extends APIResponse<{
    booking: Booking;
    session: Session;
  }> {}

export interface CheckOutBookingResponse
  extends APIResponse<{
    booking: Booking;
    session: Session;
    actualHours: number;
    refundHours: number;
    refundAmount: number;
    walletBalance?: number;
  }> {}

export interface ServicesResponse extends APIResponse<Service[]> {
  count?: number;
}
