import type { BookingStatus, SlotStatus } from './booking.types';

export interface BookingChangedEvent {
  bookingId: string;
  status: BookingStatus;
  booking?: unknown;
}

export interface SlotStatusChangedEvent {
  floorId: string;
  slotCode: string;
  status: SlotStatus;
}

export interface SocketEvents {
  'booking:changed': BookingChangedEvent;
  'slot:status_changed': SlotStatusChangedEvent;
}
