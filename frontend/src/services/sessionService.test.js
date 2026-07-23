import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;
const hadImportMetaEnv = Object.prototype.hasOwnProperty.call(Object.prototype, 'env');
const originalImportMetaEnv = Object.prototype.env;

Object.prototype.env = {};

const { getActiveSessions, getAllSessions } = await import('./sessionService.js');

let requests;

beforeEach(() => {
  requests = [];
  globalThis.localStorage = {
    getItem: (key) => (key === 'accessToken' ? 'staff-token' : null),
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    };
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

after(() => {
  if (hadImportMetaEnv) {
    Object.prototype.env = originalImportMetaEnv;
  } else {
    delete Object.prototype.env;
  }
});

test('getAllSessions requests the authenticated sessions endpoint', async () => {
  const result = await getAllSessions();

  assert.deepEqual(result, { ok: true, status: 200, data: { success: true, data: [] } });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/sessions$/);
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer staff-token');
});

test('getActiveSessions requests the authenticated active-status endpoint', async () => {
  const result = await getActiveSessions();

  assert.deepEqual(result, { ok: true, status: 200, data: { success: true, data: [] } });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/sessions\/active-status$/);
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer staff-token');
});
