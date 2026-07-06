const Session = require('../models/Session');
const notifTriggers = require('./notificationTriggers');
const contractService = require('./contractService');

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const CONTRACT_EXPIRATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOW_BALANCE_THRESHOLD = 30000; // 30,000 VND

let schedulerInterval = null;
let contractSchedulerInterval = null;

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
  checkExpiredContracts(app).catch((err) =>
    console.error('[ParkingScheduler] Initial contract expiration error:', err.message)
  );

  // Then run every interval
  schedulerInterval = setInterval(() => {
    checkActiveSessions(app).catch((err) =>
      console.error('[ParkingScheduler] Interval check error:', err.message)
    );
  }, CHECK_INTERVAL_MS);

  contractSchedulerInterval = setInterval(() => {
    checkExpiredContracts(app).catch((err) =>
      console.error('[ParkingScheduler] Contract expiration interval error:', err.message)
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
  checkExpiredContracts,
  LOW_BALANCE_THRESHOLD,
};
