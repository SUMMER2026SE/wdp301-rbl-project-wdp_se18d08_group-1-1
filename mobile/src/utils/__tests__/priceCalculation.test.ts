import * as fc from 'fast-check';

import { calculateParkingCost, calculateServiceCost, calculateTotalBookingCost } from '../priceCalculation';

describe('priceCalculation properties', () => {
  // Feature: customer-core-features, Property 2: Price Calculation Correctness
  it('uses ceiling hours multiplied by hourly rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 * 60 }),
        fc.integer({ min: 1_000, max: 500_000 }),
        (durationMinutes, hourlyRate) => {
          const start = new Date('2030-01-01T00:00:00.000Z');
          const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
          const expected = Math.max(1, Math.ceil(durationMinutes / 60)) * hourlyRate;

          expect(calculateParkingCost(start, end, hourlyRate)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sums service and parking costs into total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        (parkingCost, serviceCost) => {
          expect(calculateTotalBookingCost({ parkingCost, serviceCost })).toBe(parkingCost + serviceCost);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('makes selected services free for yearly VIP free-service eligibility', () => {
    expect(
      calculateServiceCost(
        [
          { _id: '1', name: 'Wash', price: 50_000 },
          { _id: '2', name: 'Care', price: 20_000 },
        ],
        true,
      ),
    ).toBe(0);
  });
});
