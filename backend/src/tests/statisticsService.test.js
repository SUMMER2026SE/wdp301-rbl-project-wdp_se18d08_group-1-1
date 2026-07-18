const test = require('node:test');
const assert = require('node:assert/strict');
const { _private } = require('../services/statisticsService');

test('resolveDateRange creates a bounded 30 day period', () => {
  const now = new Date('2030-03-31T12:00:00.000Z');
  const result = _private.resolveDateRange({ range: '30d' }, now);
  assert.equal(result.endDate.toISOString(), now.toISOString());
  assert.equal(
    result.startDate.toISOString(),
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  );
});

test('resolveDateRange rejects reversed custom dates', () => {
  assert.throws(
    () => _private.resolveDateRange({
      startDate: '2030-02-01T00:00:00.000Z',
      endDate: '2030-01-01T00:00:00.000Z',
    }),
    /startDate must be before endDate/
  );
});

test('normalizeBookingSummary computes completion rate from terminal bookings', () => {
  const result = _private.normalizeBookingSummary({
    totalBookings: 12,
    completedBookings: 8,
    activeBookings: 2,
    cancelledBookings: 1,
    expiredBookings: 1,
    scheduledHours: 22.75,
    bookingValue: 500000,
  });
  assert.equal(result.completionRate, 80);
  assert.equal(result.scheduledHours, 22.8);
  assert.equal(result.bookingValue, 500000);
});

test('timeline uses daily buckets for short ranges and monthly buckets for all time', () => {
  const shortPeriod = {
    startDate: new Date('2030-03-01T00:00:00.000Z'),
    endDate: new Date('2030-03-31T00:00:00.000Z'),
  };
  assert.equal(_private.getTimelineBucket({ range: '30d' }, shortPeriod).granularity, 'day');
  assert.equal(_private.getTimelineBucket({ range: 'all' }, {
    startDate: null,
    endDate: shortPeriod.endDate,
  }).granularity, 'month');
});
