const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveMembershipProjection,
} = require('../services/membershipProjectionService');

const NOW = new Date('2026-07-20T00:00:00.000Z');

test('projection is inactive without a usable entitlement', () => {
  assert.deepEqual(
    deriveMembershipProjection(
      [
        {
          status: 'expired',
          expireAt: new Date('2026-07-19T00:00:00.000Z'),
          packageId: 'old',
        },
      ],
      NOW
    ),
    { isVip: false, expireAt: null, packageId: null }
  );
});

test('projection uses the active entitlement with the latest expiration', () => {
  const result = deriveMembershipProjection(
    [
      {
        status: 'active',
        expireAt: new Date('2026-08-01T00:00:00.000Z'),
        packageId: 'package-a',
      },
      {
        status: 'transfer_locked',
        expireAt: new Date('2026-09-01T00:00:00.000Z'),
        packageId: 'package-b',
      },
      {
        status: 'active',
        expireAt: new Date('2026-07-20T00:00:00.000Z'),
        packageId: 'already-expired',
      },
    ],
    NOW
  );

  assert.equal(result.isVip, true);
  assert.equal(result.packageId, 'package-b');
  assert.equal(result.expireAt.toISOString(), '2026-09-01T00:00:00.000Z');
});
