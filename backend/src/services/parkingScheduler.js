const Session = require('../models/Session');
const Booking = require('../models/Booking');
const notifTriggers = require('./notificationTriggers');
const pricingEngine = require('./pricingEngine');
const walletService = require('./walletService');
const contractService = require('./contractService');
const { isEnabled } = require('../utils/featureFlags');
const { emitToUser } = require('../sockets/notificationSocket');

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const CONTRACT_EXPIRATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOW_BALANCE_THRESHOLD = 30000; // 30,000 VND
const NO_SHOW_GRACE_MS = 15 * 60 * 1000;
const CHECKIN_REMINDER_MINUTES = [15, 30];
const BOOKING_END_REMINDER_MINUTES = [5, 15, 30];

let schedulerInterval = null;
let contractSchedulerInterval = null;

function getUpcomingMilestone(targetTime, now = new Date(), milestones = []) {
  const target = new Date(targetTime);
  const current = new Date(now);
  const remainingMs = target.getTime() - current.getTime();
  if (
    Number.isNaN(target.getTime()) ||
    Number.isNaN(current.getTime()) ||
    remainingMs <= 0
  ) {
    return null;
  }

  return [...milestones]
    .sort((left, right) => left - right)
    .find((minutes) => remainingMs <= minutes * 60 * 1000) || null;
}

function toBookingNotificationDetails(booking) {
  return {
    bookingId: String(booking._id),
    slotInfo: booking.parkingSlot,
    scheduledStart: booking.scheduledStart,
    scheduledEnd: booking.scheduledEnd,
  };
}

function emitBookingChanged(app, booking) {
  if (!app || !booking?.userId) return;
  const io = app.get('io');
  if (!io) return;

  emitToUser(io, booking.userId, 'booking:changed', {
    bookingId: String(booking._id),
    status: booking.status,
    slotCode: booking.parkingSlot,
    floorId: booking.floorId ? String(booking.floorId) : null,
  });
}

async function isBookingScheduleCurrent(booking, status, scheduleField) {
  return Boolean(
    await Booking.exists({
      _id: booking._id,
      status,
      [scheduleField]: booking[scheduleField],
    })
  );
}

/**
 * Kiểm tra các phiên đặt chỗ (Booking) ngầm để hủy, hết hạn hoặc hoàn tất sớm
 */
async function checkBookings(app) {
  try {
    const now = new Date();

    // 1. Tự động hủy các booking PENDING VietQR quá 15 phút chưa thanh toán
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const pendingCancelResult = await Booking.updateMany(
      {
        status: 'PENDING',
        paymentMethod: 'vietqr',
        createdAt: { $lt: fifteenMinsAgo }
      },
      { status: 'CANCELLED' }
    );
    if (pendingCancelResult.modifiedCount > 0) {
      console.log(`[ParkingScheduler] Đã tự động hủy ${pendingCancelResult.modifiedCount} đặt chỗ chờ thanh toán VietQR.`);
    }

    // 2. Nhắc check-in trước giờ bắt đầu (30/15 phút)
    const upcomingCheckins = await Booking.find({
      status: 'PAID',
      userId: { $ne: null },
      scheduledStart: {
        $gt: now,
        $lte: new Date(now.getTime() + 30 * 60 * 1000),
      },
    }).lean();

    for (const booking of upcomingCheckins) {
      const milestone = getUpcomingMilestone(
        booking.scheduledStart,
        now,
        CHECKIN_REMINDER_MINUTES
      );
      if (
        milestone &&
        await isBookingScheduleCurrent(booking, 'PAID', 'scheduledStart')
      ) {
        await notifTriggers.notifyBookingCheckinReminder(
          app,
          booking.userId,
          toBookingNotificationDetails(booking),
          milestone
        );
      }
    }

    // 3. PAID -> EXPIRED khi trễ check-in từ 15 đến dưới 30 phút
    const gracePeriodLimit = new Date(now.getTime() - 15 * 60 * 1000);
    const cancelPeriodLimit = new Date(now.getTime() - 30 * 60 * 1000);
    const expiredBookingCandidates = await Booking.find({
      status: 'PAID',
      scheduledStart: { $gt: cancelPeriodLimit, $lte: gracePeriodLimit }
    }).select('_id').lean();

    for (const candidate of expiredBookingCandidates) {
      const booking = await Booking.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'PAID',
          scheduledStart: { $gt: cancelPeriodLimit, $lte: gracePeriodLimit },
        },
        { $set: { status: 'EXPIRED' } },
        { new: true }
      );
      if (!booking) continue;
      console.log(`[ParkingScheduler] Đặt chỗ ${booking._id} của xe ${booking.licensePlate} đã hết hạn check-in (15 phút).`);

      // Gửi thông báo hết hạn đặt chỗ nhưng báo vẫn còn 15 phút vớt vát
      if (booking.userId) {
        notifTriggers.notifyBookingCheckinExpired(app, booking.userId, {
          bookingId: booking._id.toString(),
          slotInfo: booking.parkingSlot,
          scheduledStart: booking.scheduledStart,
          scheduledEnd: booking.scheduledEnd,
          reason: 'Quá 15 phút. Bạn có thêm 15 phút để đến bãi và chọn lại ô đỗ, sau đó Booking sẽ bị hủy hoàn toàn.'
        }).catch(err => console.error('Failed to send expired booking notification:', err));
      }
      emitBookingChanged(app, booking);
    }

    // 4. PAID/EXPIRED -> CANCELLED khi no-show từ 30 phút
    const noShowBookingCandidates = await Booking.find({
      status: { $in: ['PAID', 'EXPIRED'] },
      scheduledStart: { $lte: cancelPeriodLimit }
    }).select('_id').lean();

    for (const candidate of noShowBookingCandidates) {
      const booking = await Booking.findOneAndUpdate(
        {
          _id: candidate._id,
          status: { $in: ['PAID', 'EXPIRED'] },
          scheduledStart: { $lte: cancelPeriodLimit },
        },
        { $set: { status: 'CANCELLED' } },
        { new: true }
      );
      if (!booking) continue;

      console.log(`[ParkingScheduler] Đặt chỗ ${booking._id} của xe ${booking.licensePlate} bị hủy hoàn toàn do trễ quá 30 phút.`);

      if (booking.userId) {
        notifTriggers.notifyBookingNoShowCancelled(app, booking.userId, {
          bookingId: booking._id.toString(),
          slotInfo: booking.parkingSlot,
          scheduledStart: booking.scheduledStart,
          scheduledEnd: booking.scheduledEnd,
          reason: 'Quá 30 phút từ giờ bắt đầu. Booking đã bị hủy và không được hoàn tiền (0%).'
        }).catch(err => console.error('Failed to send cancelled no-show notification:', err));

        // Không hoàn tiền cho lỗi No-show theo chính sách mới
        // (Booking tự động huỷ sau 30 phút do khách không đến -> Hoàn 0%)
      }
      emitBookingChanged(app, booking);
    }

    // 5. Nhắc booking ACTIVE trước scheduledEnd và khi vừa hết giờ
    const activeBookingsEndingSoon = await Booking.find({
      status: 'ACTIVE',
      userId: { $ne: null },
      scheduledEnd: {
        $gt: now,
        $lte: new Date(now.getTime() + 30 * 60 * 1000),
      },
    }).lean();

    for (const booking of activeBookingsEndingSoon) {
      const milestone = getUpcomingMilestone(
        booking.scheduledEnd,
        now,
        BOOKING_END_REMINDER_MINUTES
      );
      if (
        milestone &&
        await isBookingScheduleCurrent(booking, 'ACTIVE', 'scheduledEnd')
      ) {
        await notifTriggers.notifyBookingEndingSoon(
          app,
          booking.userId,
          toBookingNotificationDetails(booking),
          milestone
        );
      }
    }

    const activeBookingsPastEnd = await Booking.find({
      status: 'ACTIVE',
      userId: { $ne: null },
      scheduledEnd: { $lte: now },
    }).lean();

    for (const booking of activeBookingsPastEnd) {
      if (await isBookingScheduleCurrent(booking, 'ACTIVE', 'scheduledEnd')) {
        await notifTriggers.notifyBookingTimeExpired(
          app,
          booking.userId,
          toBookingNotificationDetails(booking)
        );
      }
    }

    // 6. Hoàn tất Booking PAUSED nếu còn ít hơn 30 phút để quay lại
    const limitTimeForPaused = new Date(now.getTime() + 30 * 60 * 1000);
    const pausedBookingCandidates = await Booking.find({
      status: 'PAUSED',
      scheduledEnd: { $lt: limitTimeForPaused }
    }).select('_id').lean();

    for (const candidate of pausedBookingCandidates) {
      const booking = await Booking.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'PAUSED',
          scheduledEnd: { $lt: limitTimeForPaused },
        },
        { $set: { status: 'COMPLETED' } },
        { new: true }
      );
      if (!booking) continue;

      emitBookingChanged(app, booking);
      console.log(`[ParkingScheduler] Booking PAUSED ${booking._id} tự động chuyển sang COMPLETED do hết thời gian chờ quay lại.`);

      // Tính tiền thực tế đã sử dụng và hoàn phần còn thừa
      if (booking.userId && booking.prepaidAmount > 0) {
        try {
          const sessions = await Session.find({ bookingId: booking._id });
          let totalSpent = 0;
          for (const sess of sessions) {
            const checkout = sess.checkOutTime || now;
            const pricing = await pricingEngine.calculatePrice(sess.checkInTime, checkout);
            totalSpent += pricing.finalTotal;
          }

          const refundAmount = booking.prepaidAmount - totalSpent;
          if (refundAmount > 0) {
            await walletService.creditWallet(
              booking.userId,
              refundAmount,
              'REFUND',
              `Hoàn tiền trả sớm tự động (PAUSED) - Biển số ${booking.licensePlate}`,
              { refSource: 'booking', refSourceId: booking._id }
            );
          }
        } catch (refundErr) {
          console.error(`[ParkingScheduler] Lỗi hoàn phí tự động cho booking PAUSED ${booking._id}:`, refundErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[ParkingScheduler] Lỗi checkBookings:', err.message);
  }
}

async function checkActiveSessions(app) {
  try {
    const activeSessions = await Session.find({
      status: 'active',
      userId: { $ne: null }, // Only notify registered users
      expectedDurationHours: { $gt: 0 },
      type: { $ne: 'BOOKING' },
    }).lean();

    if (activeSessions.length === 0) return;

    const now = new Date();

    for (const session of activeSessions) {
      try {
        const checkInTime = new Date(session.checkInTime);
        const expectedEndTime = new Date(
          checkInTime.getTime() + session.expectedDurationHours * 60 * 60 * 1000
        );
        const remainingMs = expectedEndTime.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

        const userId = session.userId.toString();
        const sessionId = session._id.toString();

        // ── Expired ──
        if (remainingMinutes <= 0) {
          await notifTriggers.notifyParkingExpired(app, userId, sessionId);
          continue;
        }

        // ── 5 minutes warning ──
        if (remainingMinutes === 5) {
          await notifTriggers.notifyParkingTimeWarning(app, userId, sessionId, 5);
          continue;
        }

        // ── 15 minutes warning ──
        if (remainingMinutes === 15) {
          await notifTriggers.notifyParkingTimeWarning(app, userId, sessionId, 15);
          continue;
        }

        // ── 30 minutes warning ──
        if (remainingMinutes === 30) {
          await notifTriggers.notifyParkingTimeWarning(app, userId, sessionId, 30);
          continue;
        }
      } catch (sessionErr) {
        console.error(
          `[ParkingScheduler] Error processing session ${session._id}:`,
          sessionErr.message
        );
      }
    }
  } catch (err) {
    console.error('[ParkingScheduler] Error checking active sessions:', err.message);
  }
}

async function checkExpiredContracts(app) {
  try {
    const expiredCount = await contractService.expireContracts(app);
    if (expiredCount > 0) {
      console.log(`[ParkingScheduler] Expired ${expiredCount} contracts.`);
    }
  } catch (err) {
    console.error('[ParkingScheduler] Error expiring contracts:', err.message);
  }
}

async function checkVIPSubscriptions(app) {
  try {
    const Subscription = require('../models/Subscription');
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 1. Send warning for subscriptions expiring in <= 3 days
    const expiringSubscriptionCandidates = await Subscription.find({
      status: 'active',
      expireAt: { $lte: threeDaysFromNow, $gt: now },
      expireWarningSent: { $ne: true }
    }).select('_id').lean();

    for (const candidate of expiringSubscriptionCandidates) {
      const sub = await Subscription.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'active',
          expireAt: { $lte: threeDaysFromNow, $gt: now },
          expireWarningSent: { $ne: true },
        },
        { $set: { expireWarningSent: true } },
        { new: true }
      );
      if (!sub) continue;

      let notification = null;
      if (sub.user) {
        notification = await notifTriggers.notifyVipExpiringSoon(app, sub.user, {
          subscriptionId: String(sub._id),
          expireAt: sub.expireAt,
          expireDate: sub.expireAt.toLocaleDateString('vi-VN'),
        });
      }

      if (!notification) {
        await Subscription.updateOne(
          { _id: sub._id, status: 'active', expireAt: sub.expireAt },
          { $set: { expireWarningSent: false } }
        );
        console.error(`[ParkingScheduler] VIP expiration warning failed for subscription ${sub._id}; it will be retried.`);
        continue;
      }

      console.log(`[ParkingScheduler] Sent VIP expiration warning for subscription ${sub._id}.`);
    }

    // 2. Mark expired subscriptions
    const expiredSubscriptionCandidates = await Subscription.find({
      status: 'active',
      expireAt: { $lte: now }
    }).select('_id').lean();

    const Slot = require('../models/Slot');
    const User = require('../models/User');
    const useOwnerGuard = isEnabled(
      'SUBSCRIPTION_SLOT_OWNER_GUARD_ENABLED',
      false
    );
    for (const candidate of expiredSubscriptionCandidates) {
      const expiringSubscription = await Subscription.findOneAndUpdate(
        { _id: candidate._id, status: 'active', expireAt: { $lte: now } },
        { $set: { status: 'expired' } },
        { new: true }
      );

      if (!expiringSubscription) {
        continue;
      }
      
      // Release slots
      for (const slot of expiringSubscription.slots) {
        const slotFilter = {
          floorID: slot.floorId,
          slotNumber: slot.slotCode,
        };
        if (useOwnerGuard) {
          slotFilter.reservedBySubscriptionId = expiringSubscription._id;
        }
        await Slot.updateOne(slotFilter, {
          $unset: {
            reservedFor: '',
            reservedBySubscriptionId: '',
            reservedUntil: '',
          },
        });
      }

      await User.updateOne(
        {
          _id: expiringSubscription.user,
          'membership.expireAt': { $lte: now },
        },
        {
          $set: {
            'membership.isVip': false,
            'membership.expireAt': null,
            'membership.packageId': null,
          },
        }
      );
      
      if (expiringSubscription.user) {
        await notifTriggers.notifyVipExpired(app, expiringSubscription.user, {
          subscriptionId: String(expiringSubscription._id),
          expireAt: expiringSubscription.expireAt,
          expireDate: expiringSubscription.expireAt.toLocaleDateString('vi-VN'),
        });
      }
      console.log(`[ParkingScheduler] Marked subscription ${expiringSubscription._id} as expired and released slots.`);
    }

  } catch (err) {
    console.error('[ParkingScheduler] Error checking VIP subscriptions:', err.message);
  }
}

/**
 * Start the parking session scheduler
 * @param {Express.Application} app - Express app instance (for io access)
 */
function startScheduler(app) {
  if (schedulerInterval || contractSchedulerInterval) {
    console.log('[ParkingScheduler] Scheduler already running, skipping start.');
    return;
  }

  console.log(`⏰ Parking scheduler started (interval: ${CHECK_INTERVAL_MS / 1000}s)`);

  // Run immediately on start
  checkActiveSessions(app).catch((err) =>
    console.error('[ParkingScheduler] Initial check error:', err.message)
  );
  checkBookings(app).catch((err) =>
    console.error('[ParkingScheduler] Initial checkBookings error:', err.message)
  );
  checkExpiredContracts(app).catch((err) =>
    console.error('[ParkingScheduler] Initial contract expiration error:', err.message)
  );
  checkVIPSubscriptions(app).catch((err) =>
    console.error('[ParkingScheduler] Initial VIP subscription check error:', err.message)
  );

  // Then run every interval
  schedulerInterval = setInterval(() => {
    checkActiveSessions(app).catch((err) =>
      console.error('[ParkingScheduler] Interval check error:', err.message)
    );
    checkBookings(app).catch((err) =>
      console.error('[ParkingScheduler] Interval checkBookings error:', err.message)
    );
  }, CHECK_INTERVAL_MS);

  contractSchedulerInterval = setInterval(() => {
    checkExpiredContracts(app).catch((err) =>
      console.error('[ParkingScheduler] Contract expiration interval error:', err.message)
    );
    checkVIPSubscriptions(app).catch((err) =>
      console.error('[ParkingScheduler] VIP subscription interval error:', err.message)
    );
  }, CONTRACT_EXPIRATION_INTERVAL_MS);
}

/**
 * Stop the parking session scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (contractSchedulerInterval) {
    clearInterval(contractSchedulerInterval);
    contractSchedulerInterval = null;
  }
  console.log('[ParkingScheduler] Scheduler stopped.');
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkActiveSessions,
  checkBookings,
  checkExpiredContracts,
  checkVIPSubscriptions,
  getUpcomingMilestone,
  LOW_BALANCE_THRESHOLD,
};
