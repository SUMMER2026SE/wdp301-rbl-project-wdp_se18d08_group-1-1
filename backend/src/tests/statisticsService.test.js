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

test('resolveDateRange starts the month at midnight in Vietnam', () => {
  const now = new Date('2030-03-15T12:00:00.000Z');
  const result = _private.resolveDateRange({ range: 'month' }, now);
  assert.equal(result.startDate.toISOString(), '2030-02-28T17:00:00.000Z');
});

test('resolveDateRange starts today at midnight in Vietnam', () => {
  const now = new Date('2030-03-15T12:00:00.000Z');
  const result = _private.resolveDateRange({ range: 'today' }, now);
  assert.equal(result.startDate.toISOString(), '2030-03-14T17:00:00.000Z');
  assert.equal(result.endDate.toISOString(), now.toISOString());
});

test('daily range resolves the selected Vietnam calendar date', () => {
  const result = _private.resolveDateRange({
    range: 'daily',
    date: '2026-07-19',
  });

  assert.equal(result.startDate.toISOString(), '2026-07-18T17:00:00.000Z');
  assert.equal(result.endDate.toISOString(), '2026-07-19T16:59:59.999Z');
});

test('daily range rejects an invalid calendar date', () => {
  assert.throws(
    () => _private.resolveDateRange({
      range: 'daily',
      date: '2026-02-30',
    }),
    /valid calendar date/
  );
});

test('daily booking match uses the same overlap rules as Booking Management', () => {
  const period = _private.resolveDateRange({
    range: 'daily',
    date: '2026-07-20',
  });
  const result = _private.buildBookingScheduleMatch(period, 'daily');
  assert.equal(result.$or.length, 3);
  assert.equal(
    result.$or[0].scheduledStart.$gte.toISOString(),
    '2026-07-19T17:00:00.000Z'
  );
  assert.equal(
    result.$or[1].scheduledEnd.$lte.toISOString(),
    '2026-07-20T16:59:59.999Z'
  );
  assert.equal(
    result.$or[2].scheduledStart.$lte.toISOString(),
    '2026-07-19T17:00:00.000Z'
  );
});

test('today booking statistics use the full local booking schedule day', () => {
  const period = {
    startDate: new Date('2030-03-14T17:00:00.000Z'),
    endDate: new Date('2030-03-15T12:00:00.000Z'),
  };
  const result = _private.buildBookingScheduleMatch(period, 'today');

  assert.equal(result.$or.length, 3);
  assert.equal(
    result.$or[1].scheduledEnd.$lte.toISOString(),
    '2030-03-15T16:59:59.999Z'
  );
});

test('all-time booking statistics do not restrict the booking schedule', () => {
  const result = _private.buildBookingScheduleMatch({
    startDate: null,
    endDate: new Date('2030-03-15T12:00:00.000Z'),
  }, 'all');

  assert.deepEqual(result, {});
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

test('completed revenue summary keeps gross and actual revenue separate', () => {
  const result = _private.normalizeCompletedBookingStatistics({
    count: 8,
    prepaidRevenue: 500000,
    additionalRevenue: 100000,
    grossRevenue: 600000,
    refundPaid: 40000,
    actualRevenue: 560000,
  });
  assert.deepEqual(result, {
    count: 8,
    prepaidRevenue: 500000,
    additionalRevenue: 100000,
    grossRevenue: 600000,
    refundPaid: 40000,
    actualRevenue: 560000,
  });
});

test('platform booking revenue separates parking and service without double counting', () => {
  const bookings = [
    {
      _id: 'booking-with-snapshot',
      paymentBreakdownSnapshot: {
        source: 'calculated',
        parkingAmount: 70,
        serviceAmount: 30,
        totalAmount: 100,
      },
      refundSettlements: [{
        payoutStatus: 'credited',
        refundableServiceAmount: 10,
      }],
    },
    {
      _id: 'legacy-booking',
      refundSettlements: [],
    },
  ];
  const financialSummaries = new Map([
    ['booking-with-snapshot', {
      prepaidCollected: 100,
      grossRevenue: 130,
      refundPaid: 10,
      actualRevenue: 120,
    }],
    ['legacy-booking', {
      prepaidCollected: 50,
      grossRevenue: 50,
      refundPaid: 0,
      actualRevenue: 50,
    }],
  ]);
  const completedServices = new Map([
    ['booking-with-snapshot', 30],
    ['legacy-booking', 15],
  ]);

  const result = _private.calculatePlatformBookingRevenue(
    bookings,
    financialSummaries,
    completedServices
  );

  assert.deepEqual(result, {
    bookingRevenue: 135,
    serviceRevenue: 35,
    completedBookingCount: 2,
    serviceBookingCount: 2,
  });
  assert.equal(result.bookingRevenue + result.serviceRevenue, 170);
});

test('platform service revenue excludes paid services that are not completed', () => {
  const bookings = [{
    _id: 'booking-with-pending-service',
    paymentBreakdownSnapshot: {
      source: 'calculated',
      parkingAmount: 80,
      serviceAmount: 20,
      totalAmount: 100,
    },
    refundSettlements: [],
  }];
  const financialSummaries = new Map([
    ['booking-with-pending-service', {
      prepaidCollected: 100,
      grossRevenue: 100,
      refundPaid: 0,
      actualRevenue: 100,
    }],
  ]);

  const result = _private.calculatePlatformBookingRevenue(
    bookings,
    financialSummaries,
    new Map()
  );

  assert.equal(result.bookingRevenue, 80);
  assert.equal(result.serviceRevenue, 0);
  assert.equal(result.serviceBookingCount, 0);
});

test('platform revenue uses lifecycle timestamps with a legacy fallback', () => {
  const period = {
    startDate: new Date('2030-03-01T00:00:00.000Z'),
    endDate: new Date('2030-03-31T23:59:59.999Z'),
  };
  const match = _private.buildLifecycleDateMatch('completedAt', 'updatedAt', period);

  assert.equal(match.$or[0].completedAt.$gte, period.startDate);
  assert.equal(match.$or[0].completedAt.$lte, period.endDate);
  assert.equal(match.$or[1].completedAt, null);
  assert.equal(match.$or[1].updatedAt.$gte, period.startDate);
});
