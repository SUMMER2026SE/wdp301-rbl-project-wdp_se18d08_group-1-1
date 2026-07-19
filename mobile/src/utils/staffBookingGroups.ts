import type { StaffBooking } from '@/services/api/staff';

export type StaffBookingGroup = 'ACTIVE' | 'UPCOMING' | 'HISTORY';

const HISTORY_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'EXPIRED']);
const ACTIVE_STATUSES = new Set(['ACTIVE', 'PAUSED']);

export function getStaffBookingGroup(status: string): StaffBookingGroup {
  const normalizedStatus = status.toUpperCase();

  if (ACTIVE_STATUSES.has(normalizedStatus)) {
    return 'ACTIVE';
  }

  if (HISTORY_STATUSES.has(normalizedStatus)) {
    return 'HISTORY';
  }

  return 'UPCOMING';
}

export function groupAndSortStaffBookings(bookings: StaffBooking[]) {
  const groups: Record<StaffBookingGroup, StaffBooking[]> = {
    ACTIVE: [],
    UPCOMING: [],
    HISTORY: [],
  };

  bookings.forEach((booking) => {
    groups[getStaffBookingGroup(booking.status)].push(booking);
  });

  groups.ACTIVE.sort(
    (left, right) =>
      new Date(right.scheduledStart).getTime() - new Date(left.scheduledStart).getTime(),
  );
  groups.UPCOMING.sort(
    (left, right) =>
      new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime(),
  );
  groups.HISTORY.sort(
    (left, right) =>
      new Date(right.scheduledEnd).getTime() - new Date(left.scheduledEnd).getTime(),
  );

  return groups;
}
