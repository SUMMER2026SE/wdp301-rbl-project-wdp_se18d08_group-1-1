const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveMembershipProjection,
  getUnmigratedLegacySlots,
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

test('legacy fallback excludes a slot after its entitlement was transferred', () => {
  const subscriptions = [
    {
      _id: 'subscription-d1',
      slots: [{ floorId: 'floor-1', slotCode: 'D1' }],
    },
  ];
  const sourceEntitlements = [
    {
      sourceSubscriptionId: 'subscription-d1',
      floorId: 'floor-1',
      slotCode: 'D1',
      ownerId: 'recipient',
      status: 'active',
      transferCount: 1,
    },
  ];

  assert.deepEqual(
    getUnmigratedLegacySlots(subscriptions, sourceEntitlements),
    []
  );
});

test('legacy fallback keeps only unbackfilled slots in a partial migration', () => {
  const subscription = {
    _id: 'subscription-two-slots',
    slots: [
      { floorId: 'floor-1', slotCode: 'D1' },
      { floorId: 'floor-1', slotCode: 'D2' },
    ],
  };
  const sourceEntitlements = [
    {
      sourceSubscriptionId: subscription._id,
      floorId: 'floor-1',
      slotCode: 'd1',
      status: 'active',
    },
  ];

  const result = getUnmigratedLegacySlots(
    [subscription],
    sourceEntitlements
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].subscription, subscription);
  assert.equal(result[0].slot.slotCode, 'D2');
});

test('legacy fallback preserves a subscription that has never been backfilled', () => {
  const subscription = {
    _id: 'legacy-subscription',
    slots: [{ floorId: 'floor-1', slotCode: 'B3' }],
  };

  const result = getUnmigratedLegacySlots([subscription], []);

  assert.equal(result.length, 1);
  assert.equal(result[0].slot.slotCode, 'B3');
});

test('any migrated entitlement state prevents a legacy slot from resurrecting', () => {
  const subscription = {
    _id: 'transferred-subscription',
    slots: [{ floorId: 'floor-1', slotCode: 'D1' }],
  };

  const result = getUnmigratedLegacySlots(
    [subscription],
    [
      {
        sourceSubscriptionId: subscription._id,
        floorId: 'floor-1',
        slotCode: 'D1',
        status: 'expired',
      },
    ]
  );

  assert.deepEqual(result, []);
});
