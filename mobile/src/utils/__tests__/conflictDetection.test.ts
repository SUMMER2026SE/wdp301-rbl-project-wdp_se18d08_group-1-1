import * as fc from 'fast-check';

import type { Booking } from '@/types/booking.types';

import { checkVehicleConflict } from '../conflictDetection';

const makeBooking = (startTime: Date, endTime: Date, status: Booking['status'] = 'confirmed'): Booking => ({
  _id: '507f1f77bcf86cd799439011',
  userId: 'user',
  floorId: 'floor',
  slotCode: 'A1',
  licensePlate: '51A-12345',
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  status,
  paidHours: 1,
  hourlyRate: 10000,
  prepaidAmount: 10000,
  serviceAmount: 0,
  finalAmount: 10000,
  paymentMethod: 'wallet',
  paymentStatus: 'paid',
  createdAt: startTime.toISOString(),
});

describe('conflictDetection properties', () => {
  // Feature: customer-core-features, Property 8: Vehicle Conflict Detection
  it('detects overlapping confirmed or active bookings for the same vehicle', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 120 }), fc.integer({ min: 1, max: 120 }), (offset, duration) => {
        const base = new Date('2030-01-01T08:00:00.000Z');
        const existingStart = new Date(base.getTime());
        const existingEnd = new Date(base.getTime() + 2 * 60 * 60 * 1000);
        const requestedStart = new Date(base.getTime() + offset * 60 * 1000);
        const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 1000);
        const overlaps = existingStart < requestedEnd && existingEnd > requestedStart;

        expect(
          checkVehicleConflict('51A-12345', requestedStart, requestedEnd, [
            makeBooking(existingStart, existingEnd),
          ]).hasConflict,
        ).toBe(overlaps);
      }),
      { numRuns: 100 },
    );
  });
});
