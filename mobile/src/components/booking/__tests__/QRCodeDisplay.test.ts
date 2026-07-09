import * as fc from 'fast-check';

import { isValidBookingQrValue } from '../QRCodeDisplay';

describe('QRCodeDisplay properties', () => {
  // Feature: customer-core-features, Property 7: QR Code Format Validity
  it('accepts 24-character hexadecimal MongoDB ObjectId values', () => {
    const objectIdArbitrary = fc
      .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
        minLength: 24,
        maxLength: 24,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(objectIdArbitrary, (value) => {
        expect(isValidBookingQrValue(value)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
