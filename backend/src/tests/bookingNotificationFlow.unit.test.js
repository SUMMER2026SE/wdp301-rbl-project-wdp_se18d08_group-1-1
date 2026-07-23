const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const notificationService = require('../services/notificationService');
const notificationTriggers = require('../services/notificationTriggers');
const { getUpcomingMilestone } = require('../services/parkingScheduler');

const NOW = new Date('2026-07-20T10:00:00.000Z');
const USER_ID = '507f1f77bcf86cd799439011';
const BOOKING_ID = '507f1f77bcf86cd799439012';

const minutesAfter = (minutes) => new Date(NOW.getTime() + minutes * 60 * 1000);

describe('booking notification milestone selection', () => {
  test('selects only the closest check-in milestone', () => {
    assert.equal(getUpcomingMilestone(minutesAfter(29), NOW, [15, 30]), 30);
    assert.equal(getUpcomingMilestone(minutesAfter(15), NOW, [15, 30]), 15);
    assert.equal(getUpcomingMilestone(minutesAfter(8), NOW, [15, 30]), 15);
  });

  test('selects 30, 15 and 5 minute ending milestones without overlap', () => {
    assert.equal(getUpcomingMilestone(minutesAfter(25), NOW, [5, 15, 30]), 30);
    assert.equal(getUpcomingMilestone(minutesAfter(12), NOW, [5, 15, 30]), 15);
    assert.equal(getUpcomingMilestone(minutesAfter(4), NOW, [5, 15, 30]), 5);
  });

  test('does not select a milestone outside the window or after expiration', () => {
    assert.equal(getUpcomingMilestone(minutesAfter(31), NOW, [5, 15, 30]), null);
    assert.equal(getUpcomingMilestone(minutesAfter(0), NOW, [5, 15, 30]), null);
    assert.equal(getUpcomingMilestone(minutesAfter(-1), NOW, [5, 15, 30]), null);
  });
});

describe('direct booking notification triggers', { concurrency: false }, () => {
  const originalCreateAutoNotification = notificationService.createAutoNotification;
  const calls = [];
  const bookingDetails = {
    bookingId: BOOKING_ID,
    slotInfo: 'A-01',
    scheduledStart: minutesAfter(30),
    scheduledEnd: minutesAfter(90),
  };

  before(() => {
    notificationService.createAutoNotification = async (...args) => {
      calls.push(args);
      return { _id: 'notification-id', title: 'Test', content: 'Test' };
    };
  });

  after(() => {
    notificationService.createAutoNotification = originalCreateAutoNotification;
  });

  test('check-in reminder bypasses rules and uses a schedule-specific dedup key', async () => {
    calls.length = 0;
    await notificationTriggers.notifyBookingCheckinReminder(
      null,
      USER_ID,
      bookingDetails,
      30
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'BOOKING_CHECKIN_REMINDER_30');
    assert.match(calls[0][1], new RegExp(`booking_${BOOKING_ID}_checkin_30_`));
    assert.equal(calls[0][3], 'BOOKING_CHECKIN_REMINDER');
    assert.equal(calls[0][4].minutes, 30);
    assert.equal(calls[0][4].bookingId, BOOKING_ID);
  });

  test('ending reminder uses scheduledEnd in its dedup key', async () => {
    calls.length = 0;
    await notificationTriggers.notifyBookingEndingSoon(
      null,
      USER_ID,
      bookingDetails,
      5
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'BOOKING_ENDING_5');
    assert.match(
      calls[0][1],
      new RegExp(`ending_5_${bookingDetails.scheduledEnd.getTime()}$`)
    );
    assert.equal(calls[0][3], 'BOOKING_ENDING_SOON');
  });

  test('invalid reminder milestones are ignored', async () => {
    calls.length = 0;
    await notificationTriggers.notifyBookingCheckinReminder(
      null,
      USER_ID,
      bookingDetails,
      10
    );
    await notificationTriggers.notifyBookingEndingSoon(
      null,
      USER_ID,
      bookingDetails,
      10
    );
    assert.equal(calls.length, 0);
  });

  test('overdue and no-show notifications use different event types and references', async () => {
    calls.length = 0;
    await notificationTriggers.notifyBookingCheckinExpired(
      null,
      USER_ID,
      bookingDetails
    );
    await notificationTriggers.notifyBookingNoShowCancelled(
      null,
      USER_ID,
      bookingDetails
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], 'BOOKING_CHECKIN_EXPIRED');
    assert.equal(calls[1][0], 'BOOKING_NO_SHOW_CANCELLED');
    assert.notEqual(calls[0][1], calls[1][1]);
  });
});

describe('direct VIP notification triggers', { concurrency: false }, () => {
  const originalCreateAutoNotification = notificationService.createAutoNotification;
  const calls = [];
  const subscriptionDetails = {
    subscriptionId: BOOKING_ID,
    expireAt: minutesAfter(3 * 24 * 60),
    expireDate: '23/07/2026',
  };

  before(() => {
    notificationService.createAutoNotification = async (...args) => {
      calls.push(args);
      return { _id: 'notification-id', title: 'Test', content: 'Test' };
    };
  });

  after(() => {
    notificationService.createAutoNotification = originalCreateAutoNotification;
  });

  test('expiring and expired notifications bypass rules and have distinct keys', async () => {
    calls.length = 0;
    await notificationTriggers.notifyVipExpiringSoon(
      null,
      USER_ID,
      subscriptionDetails
    );
    await notificationTriggers.notifyVipExpired(
      null,
      USER_ID,
      subscriptionDetails
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], 'VIP_EXPIRING_SOON');
    assert.equal(calls[0][3], 'VIP_EXPIRING_SOON');
    assert.equal(calls[0][4].subscriptionId, BOOKING_ID);
    assert.equal(calls[1][0], 'VIP_EXPIRED');
    assert.equal(calls[1][3], 'VIP_EXPIRED');
    assert.notEqual(calls[0][1], calls[1][1]);
  });
});
