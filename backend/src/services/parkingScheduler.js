const Session = require('../models/Session');
const Booking = require('../models/Booking');
const notifTriggers = require('./notificationTriggers');
const { emitToUser } = require('../sockets/notificationSocket');

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const LOW_BALANCE_THRESHOLD = 30000; // 30,000 VND
const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

let schedulerInterval = null;

/**
 * Parking Session Scheduler
 *
 * Runs every 1 minute to check active parking sessions and send
 * time-based warnings (30min, 15min, 5min, expired).
 *
 * Also checks wallet balances for low balance warnings after payments.
 *
 * Deduplication is handled by NotificationEventLog in notificationService,
 * so each warning is only sent once per session.
 */

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
  expireNoShowBookings(app).catch((err) =>
    console.error('[ParkingScheduler] Initial booking expiry error:', err.message)
  );

  // Then run every interval
  schedulerInterval = setInterval(() => {
    checkActiveSessions(app).catch((err) =>
      console.error('[ParkingScheduler] Interval check error:', err.message)
    );
    expireNoShowBookings(app).catch((err) =>
      console.error('[ParkingScheduler] Booking expiry interval error:', err.message)
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
  expireNoShowBookings,
  LOW_BALANCE_THRESHOLD,
};
