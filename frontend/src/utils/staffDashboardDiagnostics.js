const objectId = (value) => String(value?._id || value || '');
const isActive = (session) => String(session?.status || '').toLowerCase() === 'active';
const sameCalendarDay = (value, now) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
};

const slotElements = (floor) => (floor?.layoutData?.elements || [])
  .filter((element) => element?.type?.startsWith('slot'))
  .map((element) => ({
    id: element.id,
    name: element.name || '',
    type: element.type,
  }))
  .sort((firstSlot, secondSlot) => {
    const firstLabel = firstSlot.name || firstSlot.id;
    const secondLabel = secondSlot.name || secondSlot.id;

    return firstLabel.localeCompare(secondLabel, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

const bookingTimestamp = (booking) => {
  const timestamp = new Date(
    booking?.createdAt || booking?.scheduledStart || booking?.updatedAt
  ).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getStaffDashboardSyncStatus = ({
  floors = false,
  bookings = false,
  sessions = false,
  slotsOk = false,
} = {}) => {
  const unavailableSources = [
    !floors && 'Floor',
    !bookings && 'booking',
    !sessions && 'session',
    !slotsOk && 'slots',
  ].filter(Boolean);
  const lastSource = unavailableSources.pop();
  const sourceLabel = unavailableSources.length > 0
    ? `${unavailableSources.join(', ')} and ${lastSource}`
    : lastSource;

  return {
    isAvailable: !sourceLabel,
    error: sourceLabel
      ? `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} data unavailable.`
      : '',
    sources: { floors, bookings, sessions, slotsOk },
  };
};

export const buildStaffDashboardMetrics = ({
  floors = [],
  dbSlots = [],
  sessions = [],
  bookings = [],
  now = new Date(),
}) => {
  const activeFloor = floors[0] || null;
  const activeFloorSlots = slotElements(activeFloor);
  const totalSlots = floors.reduce(
    (count, floor) => count + slotElements(floor).length,
    0
  );
  const activeFloorId = objectId(activeFloor?._id);
  const activeFloorSlotNames = new Set(
    activeFloorSlots.map((slot) => String(slot.name || slot.id))
  );
  const activeSessions = sessions.filter(isActive);
  const occupiedActiveFloorSlotNames = new Set(
    activeSessions
      .filter((session) => objectId(session?.floorId) === activeFloorId)
      .map((session) => String(session?.parkingSlot || ''))
      .filter((slotName) => activeFloorSlotNames.has(slotName))
  );
  const maintenanceSlots = dbSlots.filter((slot) =>
    objectId(slot?.floorID) === activeFloorId &&
    String(slot?.status || '').toLowerCase() === 'maintenance'
  );
  const overdueSessions = activeSessions.filter((session) => {
    if (objectId(session?.floorId) !== activeFloorId) return false;

    const checkInTime = new Date(session?.checkInTime);
    const expectedDurationHours = Number(session?.expectedDurationHours);
    const hasCompleteTiming = session?.checkInTime &&
      session?.expectedDurationHours !== undefined &&
      session?.expectedDurationHours !== null &&
      !Number.isNaN(checkInTime.getTime()) &&
      Number.isFinite(expectedDurationHours);

    return hasCompleteTiming &&
      checkInTime.getTime() + (expectedDurationHours * 60 * 60 * 1000) < now.getTime();
  });
  const cancellationsToday = bookings.filter((booking) =>
    String(booking?.status || '').toUpperCase() === 'CANCELLED' &&
    sameCalendarDay(booking?.updatedAt || booking?.createdAt, now)
  ).length;
  const recentBookings = [...bookings]
    .sort((firstBooking, secondBooking) =>
      bookingTimestamp(secondBooking) - bookingTimestamp(firstBooking)
    )
    .slice(0, 5);
  const occupancyRate = activeFloorSlots.length > 0
    ? Math.round((occupiedActiveFloorSlotNames.size / activeFloorSlots.length) * 100)
    : 0;

  return {
    totalSlots,
    activeFloor,
    activeFloorSlots,
    vehiclesInside: activeSessions.length,
    cancellationsToday,
    recentBookings,
    occupancyRate,
    maintenanceSlots,
    overdueSessions,
  };
};
