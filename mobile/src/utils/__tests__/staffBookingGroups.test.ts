import type { StaffBooking } from '@/services/api/staff';
import {
  getStaffBookingGroup,
  groupAndSortStaffBookings,
} from '@/utils/staffBookingGroups';

const booking = (
  id: string,
  status: string,
  scheduledStart: string,
  scheduledEnd: string,
): StaffBooking => ({
  _id: id,
  licensePlate: id,
  parkingSlot: 'A1',
  scheduledStart,
  scheduledEnd,
  status,
});

describe('staff booking groups', () => {
  it.each([
    ['ACTIVE', 'ACTIVE'],
    ['paused', 'ACTIVE'],
    ['PAID', 'UPCOMING'],
    ['PENDING', 'UPCOMING'],
    ['COMPLETED', 'HISTORY'],
    ['CANCELLED', 'HISTORY'],
    ['EXPIRED', 'HISTORY'],
  ])('maps %s to %s', (status, expectedGroup) => {
    expect(getStaffBookingGroup(status)).toBe(expectedGroup);
  });

  it('sorts active first by newest start, upcoming by nearest start, and history by newest end', () => {
    const groups = groupAndSortStaffBookings([
      booking('history-old', 'COMPLETED', '2026-07-17T08:00:00Z', '2026-07-17T09:00:00Z'),
      booking('upcoming-later', 'PAID', '2026-07-17T15:00:00Z', '2026-07-17T16:00:00Z'),
      booking('active-old', 'ACTIVE', '2026-07-17T10:00:00Z', '2026-07-17T11:00:00Z'),
      booking('active-new', 'PAUSED', '2026-07-17T11:00:00Z', '2026-07-17T12:00:00Z'),
      booking('history-new', 'CANCELLED', '2026-07-17T12:00:00Z', '2026-07-17T13:00:00Z'),
      booking('upcoming-near', 'PENDING', '2026-07-17T14:00:00Z', '2026-07-17T15:00:00Z'),
    ]);

    expect(groups.ACTIVE.map(({ _id }) => _id)).toEqual(['active-new', 'active-old']);
    expect(groups.UPCOMING.map(({ _id }) => _id)).toEqual([
      'upcoming-near',
      'upcoming-later',
    ]);
    expect(groups.HISTORY.map(({ _id }) => _id)).toEqual(['history-new', 'history-old']);
  });
});
