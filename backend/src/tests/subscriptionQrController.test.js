const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.PAYOS_CLIENT_ID = 'test-client';
process.env.PAYOS_API_KEY = 'test-api-key';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum-key';
process.env.MEMBERSHIP_QR_SECRET = 'test-membership-qr-secret';

const Subscription = require('../models/Subscription');
const subscriptionController = require('../controllers/subscriptionController');

const createResponse = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
};

test('account endpoint preserves legacy QR for an active legacy subscription', async (t) => {
  const originalFindOne = Subscription.findOne;
  t.after(() => { Subscription.findOne = originalFindOne; });

  const userId = new mongoose.Types.ObjectId();
  const subscription = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    status: 'active',
    paymentStatus: 'paid',
    expireAt: new Date(Date.now() + 60_000),
    qrVersion: 2,
  };
  Subscription.findOne = () => ({ sort: async () => subscription });
  const res = createResponse();

  await subscriptionController.getMembershipQr({
    user: { _id: userId, role: 'customer', membership: { isVip: false, expireAt: null } },
  }, res, assert.fail);

  assert.equal(res.result.body.data.credentialType, 'LEGACY_SUBSCRIPTION');
  assert.match(res.result.body.data.payload, /^VALO_MEMBERSHIP:2:/);
});

test('legacy endpoint scopes a subscription QR to its owner', async (t) => {
  const originalFindOne = Subscription.findOne;
  t.after(() => { Subscription.findOne = originalFindOne; });

  const userId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  let receivedQuery;
  Subscription.findOne = async (query) => {
    receivedQuery = query;
    return {
      _id: subscriptionId,
      user: userId,
      status: 'active',
      paymentStatus: 'paid',
      expireAt: new Date(Date.now() + 60_000),
      qrVersion: 1,
    };
  };
  const res = createResponse();

  await subscriptionController.getSubscriptionMembershipQr({
    params: { subscriptionId: String(subscriptionId) },
    user: { _id: userId, role: 'customer' },
  }, res, assert.fail);

  assert.deepEqual(receivedQuery, { _id: String(subscriptionId), user: userId });
  assert.match(res.result.body.data.payload, /^VALO_MEMBERSHIP:1:/);
});

test('legacy endpoint rejects an invalid subscription ID before querying MongoDB', async (t) => {
  const originalFindOne = Subscription.findOne;
  t.after(() => { Subscription.findOne = originalFindOne; });
  let queried = false;
  Subscription.findOne = async () => {
    queried = true;
    return null;
  };
  const res = createResponse();

  await subscriptionController.getSubscriptionMembershipQr({
    params: { subscriptionId: 'not-an-object-id' },
    user: { _id: new mongoose.Types.ObjectId(), role: 'customer' },
  }, res, assert.fail);

  assert.equal(res.result.statusCode, 400);
  assert.equal(queried, false);
});
