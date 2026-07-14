import {
  isParkingSlotSelectable,
  isVipParkingSlotLayoutName,
  resolveParkingSlotStatus,
} from '../parkingSlotStatus';

const baseState = {
  hasAvailableSlot: true,
  isMaintenance: false,
  isOccupied: false,
  isHeld: false,
  isReserved: false,
};

describe('parking slot visual status', () => {
  it('shows a reserved slot as VIP even when it is available to its owner', () => {
    expect(resolveParkingSlotStatus({ ...baseState, isReserved: true })).toBe('reserved');
  });

  it('prioritizes live occupancy over a VIP reservation', () => {
    expect(
      resolveParkingSlotStatus({ ...baseState, isOccupied: true, isReserved: true }),
    ).toBe('occupied');
  });

  it('shows a normal slot returned by the availability API as available', () => {
    expect(resolveParkingSlotStatus(baseState)).toBe('available');
  });

  it('never allows a displayed VIP slot to be selected', () => {
    expect(isParkingSlotSelectable('reserved', true)).toBe(false);
    expect(isParkingSlotSelectable('available', true)).toBe(true);
  });

  it.each(['held', 'occupied', 'maintenance'] as const)(
    'never allows a %s slot to be selected even when availability data is stale',
    (status) => {
      expect(isParkingSlotSelectable(status, true)).toBe(false);
    },
  );

  it('recognizes the lowercase layout convention used by VIP-only slots', () => {
    expect(isVipParkingSlotLayoutName('c1')).toBe(true);
    expect(isVipParkingSlotLayoutName('C1')).toBe(false);
    expect(isVipParkingSlotLayoutName('D1')).toBe(false);
  });
});
