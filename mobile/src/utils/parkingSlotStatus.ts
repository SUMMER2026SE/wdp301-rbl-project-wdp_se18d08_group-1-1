export type ParkingSlotVisualStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'held'
  | 'maintenance';

interface ResolveParkingSlotStatusInput {
  hasAvailableSlot: boolean;
  isMaintenance: boolean;
  isOccupied: boolean;
  isHeld: boolean;
  isReserved: boolean;
}

export const resolveParkingSlotStatus = ({
  hasAvailableSlot,
  isMaintenance,
  isOccupied,
  isHeld,
  isReserved,
}: ResolveParkingSlotStatusInput): ParkingSlotVisualStatus => {
  if (isMaintenance) return 'maintenance';
  if (isOccupied) return 'occupied';
  if (isHeld) return 'held';
  if (isReserved) return 'reserved';
  return hasAvailableSlot ? 'available' : 'occupied';
};

export const isParkingSlotSelectable = (
  status: ParkingSlotVisualStatus,
  hasAvailableSlot: boolean,
) => hasAvailableSlot && status === 'available';

// Parking layout convention: lowercase slot codes belong to the VIP-only zone.
export const isVipParkingSlotLayoutName = (slotName: unknown) => {
  const value = String(slotName ?? '').trim();
  return value.length > 0 && value !== value.toUpperCase();
};
