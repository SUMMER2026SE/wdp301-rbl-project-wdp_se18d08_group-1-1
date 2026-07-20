const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const Booking = require('../models/Booking');
const Session = require('../models/Session');
const notificationTriggers = require('../services/notificationTriggers');
const { checkBookings } = require('../services/parkingScheduler');

const USER_ID = '507f1f77bcf86cd799439011';

function queryResult(items) {
  return {
    select() {
      return this;
    },
    async lean() {
      return items;
    },
  };
}

function booking(id, status, scheduledStart, scheduledEnd, extra = {}) {
  return {
    _id: id,
    userId: USER_ID,
    status,
    scheduledStart,
    scheduledEnd,
    parkingSlot: `A-${id.slice(-1)}`,
    licensePlate: `TEST${id.slice(-1)}`,
    prepaidAmount: 0,
    ...extra,
  };
}

describe('booking scheduler end-to-end decision flow', { concurrency: false }, () => {
  const originals = {};
  const triggerCalls = [];
  const atomicUpdates = [];
  let pendingUpdate;
  let fixtures;
  let scheduleIsCurrent;

  before(() => {
    originals.bookingUpdateMany = Booking.updateMany;
    originals.bookingFind = Booking.find;
    originals.bookingFindOneAndUpdate = Booking.findOneAndUpdate;
    originals.bookingExists = Booking.exists;
    originals.sessionFind = Session.find;
    originals.consoleLog = console.log;
    originals.notifyBookingCheckinReminder = notificationTriggers.notifyBookingCheckinReminder;
    originals.notifyBookingCheckinExpired = notificationTriggers.notifyBookingCheckinExpired;
    originals.notifyBookingNoShowCancelled = notificationTriggers.notifyBookingNoShowCancelled;
    originals.notifyBookingEndingSoon = notificationTriggers.notifyBookingEndingSoon;
    originals.notifyBookingTimeExpired = notificationTriggers.notifyBookingTimeExpired;

    console.log = () => {};
    Booking.updateMany = async (filter, update) => {
      pendingUpdate = { filter, update };
      return { modifiedCount: 1 };
    };
    Booking.find = (query) => {
      if (query.status === 'PAID' && query.userId) {
        return queryResult(fixtures.upcoming);
      }
      if (query.status === 'PAID' && query.scheduledStart) {
        return queryResult(fixtures.expiredCandidates);
      }
      if (query.status?.$in) {
        return queryResult(fixtures.noShowCandidates);
      }
      if (query.status === 'ACTIVE' && query.scheduledEnd?.$gt) {
        return queryResult(fixtures.endingSoon);
      }
      if (query.status === 'ACTIVE' && query.scheduledEnd?.$lte) {
        return queryResult(fixtures.pastEnd);
      }
      if (query.status === 'PAUSED') {
        return queryResult(fixtures.pausedCandidates);
      }
      throw new Error(`Unexpected Booking.find query: ${JSON.stringify(query)}`);
    };
    Booking.findOneAndUpdate = async (filter, update) => {
      atomicUpdates.push({ filter, update });
      return fixtures.atomicResults[String(filter._id)] || null;
    };
    Booking.exists = async () => scheduleIsCurrent;
    Session.find = async () => [];

    notificationTriggers.notifyBookingCheckinReminder = async (...args) => {
      triggerCalls.push(['checkin-reminder', ...args]);
      return {};
    };
    notificationTriggers.notifyBookingCheckinExpired = async (...args) => {
      triggerCalls.push(['checkin-expired', ...args]);
      return {};
    };
    notificationTriggers.notifyBookingNoShowCancelled = async (...args) => {
      triggerCalls.push(['no-show-cancelled', ...args]);
      return {};
    };
    notificationTriggers.notifyBookingEndingSoon = async (...args) => {
      triggerCalls.push(['ending-soon', ...args]);
      return {};
    };
    notificationTriggers.notifyBookingTimeExpired = async (...args) => {
      triggerCalls.push(['time-expired', ...args]);
      return {};
    };
  });

  after(() => {
    Booking.updateMany = originals.bookingUpdateMany;
    Booking.find = originals.bookingFind;
    Booking.findOneAndUpdate = originals.bookingFindOneAndUpdate;
    Booking.exists = originals.bookingExists;
    Session.find = originals.sessionFind;
    console.log = originals.consoleLog;
    notificationTriggers.notifyBookingCheckinReminder = originals.notifyBookingCheckinReminder;
    notificationTriggers.notifyBookingCheckinExpired = originals.notifyBookingCheckinExpired;
    notificationTriggers.notifyBookingNoShowCancelled = originals.notifyBookingNoShowCancelled;
    notificationTriggers.notifyBookingEndingSoon = originals.notifyBookingEndingSoon;
    notificationTriggers.notifyBookingTimeExpired = originals.notifyBookingTimeExpired;
  });

  test('routes every booking state to the correct transition and notification', async () => {
    const now = Date.now();
    const upcoming = booking(
      'booking-upcoming-1',
      'PAID',
      new Date(now + 20 * 60 * 1000),
      new Date(now + 80 * 60 * 1000)
    );
    const expired = booking(
      'booking-expired-2',
      'EXPIRED',
      new Date(now - 20 * 60 * 1000),
      new Date(now + 40 * 60 * 1000)
    );
    const cancelled = booking(
      'booking-cancelled-3',
      'CANCELLED',
      new Date(now - 31 * 60 * 1000),
      new Date(now + 29 * 60 * 1000)
    );
    const endingSoon = booking(
      'booking-ending-4',
      'ACTIVE',
      new Date(now - 30 * 60 * 1000),
      new Date(now + 12 * 60 * 1000)
    );
    const pastEnd = booking(
      'booking-past-end-5',
      'ACTIVE',
      new Date(now - 90 * 60 * 1000),
      new Date(now - 60 * 1000)
    );
    const completed = booking(
      'booking-completed-6',
      'COMPLETED',
      new Date(now - 60 * 60 * 1000),
      new Date(now + 20 * 60 * 1000)
    );

    fixtures = {
      upcoming: [upcoming],
      expiredCandidates: [{ _id: expired._id }],
      noShowCandidates: [{ _id: cancelled._id }],
      endingSoon: [endingSoon],
      pastEnd: [pastEnd],
      pausedCandidates: [{ _id: completed._id }],
      atomicResults: {
        [expired._id]: expired,
        [cancelled._id]: cancelled,
        [completed._id]: completed,
      },
    };
    scheduleIsCurrent = true;
    triggerCalls.length = 0;
    atomicUpdates.length = 0;
    pendingUpdate = null;

    await checkBookings(null);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(pendingUpdate.filter.status, 'PENDING');
    assert.equal(pendingUpdate.filter.paymentMethod, 'vietqr');
    assert.equal(pendingUpdate.update.status, 'CANCELLED');

    assert.deepEqual(
      triggerCalls.map((call) => call[0]),
      [
        'checkin-reminder',
        'checkin-expired',
        'no-show-cancelled',
        'ending-soon',
        'time-expired',
      ]
    );
    assert.equal(triggerCalls[0][4], 30);
    assert.equal(triggerCalls[3][4], 15);

    assert.deepEqual(
      atomicUpdates.map((item) => item.update.$set.status),
      ['EXPIRED', 'CANCELLED', 'COMPLETED']
    );
    assert.equal(atomicUpdates[0].filter.status, 'PAID');
    assert.deepEqual(atomicUpdates[1].filter.status.$in, ['PAID', 'EXPIRED']);
    assert.equal(atomicUpdates[2].filter.status, 'PAUSED');
  });

  test('does not send a stale reminder after the booking schedule changes', async () => {
    const now = Date.now();
    fixtures = {
      upcoming: [
        booking(
          'booking-stale-7',
          'PAID',
          new Date(now + 20 * 60 * 1000),
          new Date(now + 80 * 60 * 1000)
        ),
      ],
      expiredCandidates: [],
      noShowCandidates: [],
      endingSoon: [],
      pastEnd: [],
      pausedCandidates: [],
      atomicResults: {},
    };
    scheduleIsCurrent = false;
    triggerCalls.length = 0;
    atomicUpdates.length = 0;

    await checkBookings(null);

    assert.equal(triggerCalls.length, 0);
    assert.equal(atomicUpdates.length, 0);
  });
});
