import * as fc from 'fast-check';

import { validateTimeRange, validateWalletBalance } from '../bookingValidation';

describe('bookingValidation properties', () => {
  // Feature: customer-core-features, Property 1: Time Range Validity
  it('accepts future ranges of at least one hour', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 240 }),
        fc.integer({ min: 60, max: 24 * 60 }),
        (startOffsetMinutes, durationMinutes) => {
          const start = new Date(Date.now() + startOffsetMinutes * 60 * 1000);
          const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

          expect(validateTimeRange(start, end).valid).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: customer-core-features, Property 6: Wallet Balance Sufficiency
  it('requires wallet balance to cover total cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (balance, required) => {
          expect(validateWalletBalance(balance, required).valid).toBe(balance >= required);
        },
      ),
      { numRuns: 100 },
    );
  });
});
