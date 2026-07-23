const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const Booking = require('../models/Booking');
const Session = require('../models/Session');
const notificationTriggers = require('../services/notificationTriggers');
const bookingRefundService = require('../services/bookingRefundService');
const {
  checkActiveSessions,
  checkBookings,
} = require('../services/parkingScheduler');

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
  const settlementCalls = [];
  let pendingUpdate;
  let fixtures;
  let scheduleIsCurrent;
  let sessionQuery;

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
    originals.quoteNoShow = bookingRefundService.quoteNoShow;
    originals.quoteEarlyCheckout = bookingRefundService.quoteEarlyCheckout;
    originals.settleBookingEvent = bookingRefundService.settleBookingEvent;

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
    Session.find = (query) => {
      sessionQuery = query;
      return queryResult([]);
    };

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
    bookingRefundService.quoteNoShow = async () => ({
      refundAmount: 0,
      extraAmount: 0,
      appliedRefundPercent: 0,
    });
    bookingRefundService.quoteEarlyCheckout = async () => ({
      refundAmount: 10000,
      extraAmount: 0,
    });
    bookingRefundService.settleBookingEvent = async (options) => {
      const currentBooking = fixtures.settlementInputs[String(options.bookingId)];
      assert.ok(currentBooking, `Missing settlement input for ${options.bookingId}`);
      await options.applyState({ booking: currentBooking });
      settlementCalls.push(options);
      return {
        booking: currentBooking,
        settlement: {
          eventKey: options.eventKey,
          eventType: options.eventType,
          refundAmount: options.calculation.refundAmount,
        },
        alreadyProcessed: false,
      };
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
    bookingRefundService.quoteNoShow = originals.quoteNoShow;
    bookingRefundService.quoteEarlyCheckout = originals.quoteEarlyCheckout;
    bookingRefundService.settleBookingEvent = originals.settleBookingEvent;
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
    const noShow = booking(
      'booking-cancelled-3',
      'PAID',
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
    const paused = booking(
      'booking-completed-6',
      'PAUSED',
      new Date(now - 60 * 60 * 1000),
      new Date(now + 20 * 60 * 1000)
    );

    fixtures = {
      upcoming: [upcoming],
      expiredCandidates: [{ _id: expired._id }],
      noShowCandidates: [noShow],
      endingSoon: [endingSoon],
      pastEnd: [pastEnd],
      pausedCandidates: [paused],
      atomicResults: {
        [expired._id]: expired,
      },
      settlementInputs: {
        [noShow._id]: noShow,
        [paused._id]: paused,
      },
    };
    scheduleIsCurrent = true;
    triggerCalls.length = 0;
    atomicUpdates.length = 0;
    settlementCalls.length = 0;
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
      ['EXPIRED']
    );
    assert.equal(atomicUpdates[0].filter.status, 'PAID');
    assert.deepEqual(
      settlementCalls.map((item) => item.eventType),
      ['no_show', 'paused_completion']
    );
    assert.equal(noShow.status, 'CANCELLED');
    assert.equal(paused.status, 'COMPLETED');
  });

  test('excludes booking sessions from generic parking-time reminders', async () => {
    sessionQuery = null;

    await checkActiveSessions(null);

    assert.deepEqual(sessionQuery.type, { $ne: 'BOOKING' });
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
      settlementInputs: {},
    };
    scheduleIsCurrent = false;
    triggerCalls.length = 0;
    atomicUpdates.length = 0;
    settlementCalls.length = 0;

    await checkBookings(null);

    assert.equal(triggerCalls.length, 0);
    assert.equal(atomicUpdates.length, 0);
  });
});
