import * as fc from 'fast-check';

import { calculateCheckOutRefund } from '../refundCalculation';

describe('refundCalculation properties', () => {
  // Feature: customer-core-features, Property 3: Refund Calculation for Hourly Bookings
  it('refunds unused paid hours for hourly bookings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 24 }),
        fc.integer({ min: 1, max: 23 }),
        fc.integer({ min: 1_000, max: 500_000 }),
        (paidHours, actualHours, hourlyRate) => {
          const checkIn = new Date('2030-01-01T00:00:00.000Z');
          const checkOut = new Date(checkIn.getTime() + actualHours * 60 * 60 * 1000);
          const result = calculateCheckOutRefund(checkIn, checkOut, paidHours, hourlyRate);
          const expectedRefundHours = Math.max(0, paidHours - actualHours);

          expect(result.refundHours).toBe(expectedRefundHours);
          expect(result.refundAmount).toBe(expectedRefundHours * hourlyRate);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: customer-core-features, Property 4: No Refund for Daily Packages
  it('never refunds daily package bookings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        fc.integer({ min: 1, max: 24 }),
        fc.integer({ min: 1_000, max: 500_000 }),
        (paidHours, actualHours, hourlyRate) => {
          const checkIn = new Date('2030-01-01T00:00:00.000Z');
          const checkOut = new Date(checkIn.getTime() + actualHours * 60 * 60 * 1000);
          const result = calculateCheckOutRefund(checkIn, checkOut, paidHours, hourlyRate, 'daily');

          expect(result.refundHours).toBe(0);
          expect(result.refundAmount).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
