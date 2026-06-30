const Session = require('../models/Session');
const Booking = require('../models/Booking');
const notifTriggers = require('./notificationTriggers');
const pricingEngine = require('./pricingEngine');
const walletService = require('./walletService');

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const LOW_BALANCE_THRESHOLD = 30000; // 30,000 VND
const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

let schedulerInterval = null;

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

    // 2. Tự động chuyển Booking PAID sang EXPIRED nếu trễ quá 15 phút
    const gracePeriodLimit = new Date(now.getTime() - 15 * 60 * 1000);
    const expiredBookings = await Booking.find({
      status: 'PAID',
      scheduledStart: { $lt: gracePeriodLimit }
    });

    for (const booking of expiredBookings) {
      booking.status = 'EXPIRED';
      await booking.save();
      console.log(`[ParkingScheduler] Đặt chỗ ${booking._id} của xe ${booking.licensePlate} đã hết hạn check-in.`);

      // Gửi thông báo hết hạn đặt chỗ
      if (booking.userId) {
        notifTriggers.notifyBookingCancelled(app, booking.userId, {
          bookingId: booking._id.toString(),
          slotInfo: booking.parkingSlot,
          reason: 'Quá 15 phút từ giờ bắt đầu mà không check-in'
        }).catch(err => console.error('Failed to send expired booking notification:', err));

        // Hoàn phí đã thanh toán trước về ví
        if (booking.prepaidAmount > 0) {
          try {
            await walletService.creditWallet(
              booking.userId,
              booking.prepaidAmount,
              'REFUND',
              `Hoàn tiền Đặt chỗ hết hạn - Biển số ${booking.licensePlate}`,
              { refSource: 'booking', refSourceId: booking._id }
            );
          } catch (refundErr) {
            console.error(`[ParkingScheduler] Lỗi hoàn tiền đặt chỗ hết hạn ${booking._id}:`, refundErr.message);
          }
        }
      }
    }

    // 3. Tự động hoàn tất các Booking đang PAUSED nếu còn ít hơn 30 phút mà chưa check-in lại
    const limitTimeForPaused = new Date(now.getTime() + 30 * 60 * 1000);
    const pausedBookingsToComplete = await Booking.find({
      status: 'PAUSED',
      scheduledEnd: { $lt: limitTimeForPaused }
    });

    for (const booking of pausedBookingsToComplete) {
      booking.status = 'COMPLETED';
      await booking.save();
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

async function expireNoShowBookings(app) {
  try {
    const expiryCutoff = new Date(Date.now() - NO_SHOW_GRACE_MS);
    const overdueBookings = await Booking.find({
      status: 'confirmed',
      startTime: { $lt: expiryCutoff },
    });

    if (overdueBookings.length === 0) return;

    const io = app?.get('io');
    await Promise.all(overdueBookings.map(async (booking) => {
      booking.status = 'expired';
      await booking.save();

      if (io && booking.userId) {
        emitToUser(io, booking.userId, 'booking:changed', {
          bookingId: String(booking._id),
          status: booking.status,
          slotCode: booking.slotCode,
          floorId: booking.floorId ? String(booking.floorId) : null,
          action: 'expired_no_show',
          reason: 'Late arrival over 15 minutes',
        });
      }
    }));
  } catch (err) {
    console.error('[ParkingScheduler] Error expiring no-show bookings:', err.message);
  }
}

/**
 * Start the parking session scheduler
 * @param {Express.Application} app - Express app instance (for io access)
 */
function startScheduler(app) {
  if (schedulerInterval) {
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

  // Then run every interval
  schedulerInterval = setInterval(() => {
    checkActiveSessions(app).catch((err) =>
      console.error('[ParkingScheduler] Interval check error:', err.message)
    );
    checkBookings(app).catch((err) =>
      console.error('[ParkingScheduler] Interval checkBookings error:', err.message)
    );
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the parking session scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ParkingScheduler] Scheduler stopped.');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkActiveSessions,
  checkBookings,
  LOW_BALANCE_THRESHOLD,
};
