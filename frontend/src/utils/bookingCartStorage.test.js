import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readBookingCart,
  reconcileBookingCart,
  writeBookingCart,
} from './bookingCartStorage.js';

const createStorage = (initialEntries = {}) => {
  const values = new Map(Object.entries(initialEntries));
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const user = JSON.stringify({ id: 'customer-1' });
const storageKey = 'valo_booking_cart:customer-1';

test('restores an unexpired booking cart for the current user', () => {
  const storage = createStorage({
    valo_user: user,
    [storageKey]: JSON.stringify([
      { holdId: 'hold-1', holdExpiresAt: '2026-07-23T10:05:00.000Z' },
    ]),
  });

  assert.equal(
    readBookingCart(storage, Date.parse('2026-07-23T10:00:00.000Z')).length,
    1,
  );
});

test('does not restore expired booking holds', () => {
  const storage = createStorage({
    valo_user: user,
    [storageKey]: JSON.stringify([
      { holdId: 'hold-1', holdExpiresAt: '2026-07-23T10:00:00.000Z' },
    ]),
  });

  assert.deepEqual(
    readBookingCart(storage, Date.parse('2026-07-23T10:00:01.000Z')),
    [],
  );
});

test('removes cart items whose backend hold is no longer active', () => {
  const items = [
    { holdId: 'hold-1', holdExpiresAt: '2026-07-23T10:05:00.000Z' },
    { holdId: 'hold-2', holdExpiresAt: '2026-07-23T10:05:00.000Z' },
  ];

  assert.deepEqual(
    reconcileBookingCart(
      items,
      [{ holdId: 'hold-2' }],
      Date.parse('2026-07-23T10:00:00.000Z'),
    ),
    [items[1]],
  );
});

test('clears persisted cart storage when no valid holds remain', () => {
  const storage = createStorage({ valo_user: user });
  writeBookingCart(
    [{ holdId: 'hold-1', holdExpiresAt: '2020-01-01T00:00:00.000Z' }],
    storage,
  );

  assert.equal(storage.getItem(storageKey), null);
});
