import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStaffDashboardMetrics,
  getStaffDashboardSyncStatus,
} from './staffDashboardDiagnostics.js';

const floor = {
  _id: 'floor-1',
  name: 'Floor 1',
  layoutData: { elements: [
    { id: 'slot-a1', name: 'A1', type: 'slot' },
    { id: 'slot-a2', name: 'A2', type: 'slot' },
  ] },
};

test('calculates active-floor occupancy from matching active sessions', () => {
  const result = buildStaffDashboardMetrics({
    floors: [floor, { ...floor, _id: 'floor-2', name: 'Floor 2' }],
    dbSlots: [],
    sessions: [
      { status: 'active', floorId: 'floor-1', parkingSlot: 'A1' },
      { status: 'active', floorId: 'floor-2', parkingSlot: 'A2' },
    ],
    bookings: [],
    now: new Date('2026-07-24T12:00:00.000Z'),
  });
  assert.equal(result.vehiclesInside, 2);
  assert.equal(result.occupancyRate, 50);
});

test('returns real maintenance slots and reasons for the active floor', () => {
  const result = buildStaffDashboardMetrics({
    floors: [floor],
    dbSlots: [
      { slotNumber: 'A2', floorID: 'floor-1', status: 'maintenance', maintenanceReason: 'Camera calibration' },
      { slotNumber: 'B1', floorID: 'floor-2', status: 'maintenance', maintenanceReason: 'Ignore other floor' },
    ],
    sessions: [], bookings: [], now: new Date('2026-07-24T12:00:00.000Z'),
  });
  assert.deepEqual(result.maintenanceSlots.map(({ slotNumber, maintenanceReason }) => ({ slotNumber, maintenanceReason })), [
    { slotNumber: 'A2', maintenanceReason: 'Camera calibration' },
  ]);
});

test('detects overdue active sessions only when timing data is complete', () => {
  const result = buildStaffDashboardMetrics({
    floors: [floor], dbSlots: [], bookings: [],
    sessions: [
      { _id: 'late', status: 'active', floorId: 'floor-1', parkingSlot: 'A1', checkInTime: '2026-07-24T08:00:00.000Z', expectedDurationHours: 2 },
      { _id: 'future', status: 'active', floorId: 'floor-1', parkingSlot: 'A2', checkInTime: '2026-07-24T11:00:00.000Z', expectedDurationHours: 2 },
      { _id: 'unknown', status: 'active', floorId: 'floor-1', parkingSlot: 'A2' },
    ],
    now: new Date('2026-07-24T12:00:00.000Z'),
  });
  assert.deepEqual(result.overdueSessions.map((session) => session._id), ['late']);
});

test('counts only cancellations from the current day and sorts recent bookings newest first', () => {
  const bookings = [
    { _id: 'old', status: 'CANCELLED', updatedAt: '2026-07-23T10:00:00.000Z' },
    { _id: 'new', status: 'CANCELLED', updatedAt: '2026-07-24T11:00:00.000Z' },
    { _id: 'latest', status: 'COMPLETED', createdAt: '2026-07-24T11:30:00.000Z' },
  ];
  const result = buildStaffDashboardMetrics({ floors: [floor], dbSlots: [], sessions: [], bookings, now: new Date('2026-07-24T12:00:00.000Z') });
  assert.equal(result.cancellationsToday, 1);
  assert.deepEqual(result.recentBookings.map((booking) => booking._id), ['latest', 'new', 'old']);
});

test('reports healthy diagnostics only after every operational source succeeds', () => {
  assert.deepEqual(getStaffDashboardSyncStatus({
    floors: true,
    bookings: true,
    sessions: true,
    slotsOk: true,
  }), {
    isAvailable: true,
    error: '',
    sources: {
      floors: true,
      bookings: true,
      sessions: true,
      slotsOk: true,
    },
  });
});

test('reports failed operational sources as unavailable diagnostics', () => {
  assert.deepEqual(getStaffDashboardSyncStatus({
    floors: true,
    bookings: false,
    sessions: false,
    slotsOk: true,
  }), {
    isAvailable: false,
    error: 'Booking and session data unavailable.',
    sources: {
      floors: true,
      bookings: false,
      sessions: false,
      slotsOk: true,
    },
  });
});

test('reports unavailable diagnostics when a configured floor slot source fails', () => {
  assert.deepEqual(getStaffDashboardSyncStatus({
    floors: true,
    bookings: true,
    sessions: true,
    slotsOk: false,
  }), {
    isAvailable: false,
    error: 'Slots data unavailable.',
    sources: {
      floors: true,
      bookings: true,
      sessions: true,
      slotsOk: false,
    },
  });
});
