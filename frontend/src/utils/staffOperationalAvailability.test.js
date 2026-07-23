import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getResponseAvailability,
  getRequiredSourcesAvailability,
} from './staffOperationalAvailability.js';

const successful = (data = []) => ({ ok: true, data: { success: true, data } });

test('getResponseAvailability accepts only a successful API payload', () => {
  assert.deepEqual(getResponseAvailability(successful(['A']), 'Floors unavailable'), {
    isAvailable: true,
    data: ['A'],
    error: '',
  });

  assert.deepEqual(
    getResponseAvailability({ ok: true, data: { success: false, message: 'Floor service denied' } }, 'Floors unavailable'),
    {
      isAvailable: false,
      data: null,
      error: 'Floor service denied',
    },
  );
});

test('getRequiredSourcesAvailability invalidates the view when any required source fails', () => {
  const result = getRequiredSourcesAvailability([
    { name: 'Floors', response: successful() },
    { name: 'Floor slots', response: successful() },
    { name: 'Active sessions', response: { ok: false, data: { message: 'Sessions timed out' } } },
    { name: 'Available booking slots', response: successful() },
  ]);

  assert.deepEqual(result, {
    isAvailable: false,
    error: 'Active sessions: Sessions timed out',
    failedSources: ['Active sessions'],
  });
});
