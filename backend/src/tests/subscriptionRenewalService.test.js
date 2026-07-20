const test = require('node:test');
const assert = require('node:assert/strict');
const { _private } = require('../services/subscriptionEligibilityService');

test('monthly renewal clamps month-end dates', () => {
  const january31 = new Date('2030-01-31T10:30:00.000Z');
  assert.equal(
    _private.addPackageDuration(january31, 'monthly').toISOString(),
    '2030-02-28T10:30:00.000Z'
  );
});

test('yearly renewal handles leap day', () => {
  const leapDay = new Date('2032-02-29T00:00:00.000Z');
  assert.equal(
    _private.addPackageDuration(leapDay, 'yearly').toISOString(),
    '2033-02-28T00:00:00.000Z'
  );
});

test('slot keys include floor and normalized code', () => {
  assert.equal(_private.slotKey('floor-a', ' a01 '), 'floor-a:A01');
  assert.notEqual(
    _private.slotKey('floor-a', 'A01'),
    _private.slotKey('floor-b', 'A01')
  );
});

test('new subscription slots are required and normalized', () => {
  assert.throws(
    () => _private.normalizeRequestedSlots([]),
    (error) => error.code === 'SLOTS_REQUIRED'
  );
  assert.deepEqual(
    _private.normalizeRequestedSlots([
      { floorId: 'floor-a', slotCode: ' a01 ' },
    ]),
    [{ floorId: 'floor-a', slotCode: 'A01' }]
  );
});

test('new subscription rejects duplicate floor and slot combinations', () => {
  assert.throws(
    () =>
      _private.normalizeRequestedSlots([
        { floorId: 'floor-a', slotCode: 'a01' },
        { floorId: 'floor-a', slotCode: ' A01 ' },
      ]),
    (error) => error.code === 'DUPLICATE_SLOTS'
  );
});
