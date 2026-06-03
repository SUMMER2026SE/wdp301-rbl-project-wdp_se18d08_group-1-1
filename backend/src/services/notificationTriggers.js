const notificationService = require('./notificationService');
const { emitNotification, broadcastNotification } = require('../sockets/notificationSocket');

/**
 * Notification Trigger Helpers
 *
 * Each function:
 * 1. Creates an auto-notification with deduplication
 * 2. Emits via Socket.IO if user is online
 * 3. If user is offline, notification is still saved in DB
 *
 * Usage: const triggers = require('../services/notificationTriggers');
 *        await triggers.notifyRegistrationSuccess(req.app, userId);
 *
 * All functions are fire-and-forget safe — they catch errors internally
 * to avoid breaking the calling controller flow.
 */

// ─── Helper to get io from app ──────────────────────────────────────────────────
function getIO(app) {
  return app ? app.get('io') : null;
}

// ─── ACCOUNT ────────────────────────────────────────────────────────────────────

async function notifyRegistrationSuccess(app, userId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'REGISTRATION_SUCCESS',
      `user_${userId}_register`,
      userId,
      'REGISTRATION_SUCCESS'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyRegistrationSuccess error:', err.message);
  }
}

async function notifyEmailVerified(app, userId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'EMAIL_VERIFIED',
      `user_${userId}_email_verified`,
      userId,
      'EMAIL_VERIFIED'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyEmailVerified error:', err.message);
  }
}

async function notifyPasswordChanged(app, userId) {
  try {
    const refId = `user_${userId}_pwd_${Date.now()}`;
    const notification = await notificationService.createAutoNotification(
      'PASSWORD_CHANGED',
      refId,
      userId,
      'PASSWORD_CHANGED'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyPasswordChanged error:', err.message);
  }
}

async function notifyAccountLocked(app, userId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'ACCOUNT_LOCKED',
      `user_${userId}_locked_${Date.now()}`,
      userId,
      'ACCOUNT_LOCKED'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyAccountLocked error:', err.message);
  }
}

async function notifyAccountUnlocked(app, userId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'ACCOUNT_UNLOCKED',
      `user_${userId}_unlocked_${Date.now()}`,
      userId,
      'ACCOUNT_UNLOCKED'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyAccountUnlocked error:', err.message);
  }
}

// ─── WALLET ─────────────────────────────────────────────────────────────────────

async function notifyTopUpSuccess(app, userId, amount, balance) {
  try {
    const fmtAmount = Number(amount).toLocaleString('vi-VN');
    const fmtBalance = Number(balance).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'TOPUP_SUCCESS',
      `user_${userId}_topup_${Date.now()}`,
      userId,
      'TOPUP_SUCCESS',
      { amount: fmtAmount, balance: fmtBalance }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyTopUpSuccess error:', err.message);
  }
}

async function notifyTopUpFailed(app, userId, amount) {
  try {
    const fmtAmount = Number(amount).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'TOPUP_FAILED',
      `user_${userId}_topup_fail_${Date.now()}`,
      userId,
      'TOPUP_FAILED',
      { amount: fmtAmount }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyTopUpFailed error:', err.message);
  }
}

async function notifyRefundSuccess(app, userId, amount, balance) {
  try {
    const fmtAmount = Number(amount).toLocaleString('vi-VN');
    const fmtBalance = Number(balance).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'REFUND_SUCCESS',
      `user_${userId}_refund_${Date.now()}`,
      userId,
      'REFUND_SUCCESS',
      { amount: fmtAmount, balance: fmtBalance }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyRefundSuccess error:', err.message);
  }
}

async function notifyLowBalance(app, userId, balance) {
  try {
    const fmtBalance = Number(balance).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'LOW_BALANCE',
      `user_${userId}_lowbal_${Math.floor(Date.now() / 86400000)}`,
      userId,
      'LOW_BALANCE',
      { balance: fmtBalance }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyLowBalance error:', err.message);
  }
}

// ─── PAYMENT ────────────────────────────────────────────────────────────────────

async function notifyPaymentSuccess(app, userId, amount, sessionId) {
  try {
    const fmtAmount = Number(amount).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'PAYMENT_SUCCESS',
      `session_${sessionId}_payment`,
      userId,
      'PAYMENT_SUCCESS',
      { amount: fmtAmount }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyPaymentSuccess error:', err.message);
  }
}

async function notifyPaymentFailed(app, userId, amount) {
  try {
    const fmtAmount = Number(amount).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'PAYMENT_FAILED',
      `user_${userId}_payfail_${Date.now()}`,
      userId,
      'PAYMENT_FAILED',
      { amount: fmtAmount }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyPaymentFailed error:', err.message);
  }
}

// ─── BOOKING ────────────────────────────────────────────────────────────────────

async function notifyBookingSuccess(app, userId, bookingDetails = {}) {
  try {
    const notification = await notificationService.createAutoNotification(
      'BOOKING_SUCCESS',
      `booking_${bookingDetails.bookingId || Date.now()}_created`,
      userId,
      'BOOKING_SUCCESS',
      { slotInfo: bookingDetails.slotInfo || 'N/A' }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyBookingSuccess error:', err.message);
  }
}

async function notifyBookingCancelled(app, userId, bookingDetails = {}) {
  try {
    const notification = await notificationService.createAutoNotification(
      'BOOKING_CANCELLED',
      `booking_${bookingDetails.bookingId || Date.now()}_cancelled`,
      userId,
      'BOOKING_CANCELLED',
      {
        slotInfo: bookingDetails.slotInfo || 'N/A',
        reason: bookingDetails.reason || '',
      }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyBookingCancelled error:', err.message);
  }
}

// ─── PARKING ────────────────────────────────────────────────────────────────────

async function notifyVehicleEntry(app, userId, plate, slot) {
  try {
    const notification = await notificationService.createAutoNotification(
      'VEHICLE_ENTRY',
      `user_${userId}_entry_${Date.now()}`,
      userId,
      'VEHICLE_ENTRY',
      { plate, slot: slot || 'N/A' }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyVehicleEntry error:', err.message);
  }
}

async function notifyVehicleExit(app, userId, plate, totalCost) {
  try {
    const fmtCost = Number(totalCost).toLocaleString('vi-VN');
    const notification = await notificationService.createAutoNotification(
      'VEHICLE_EXIT',
      `user_${userId}_exit_${Date.now()}`,
      userId,
      'VEHICLE_EXIT',
      { plate, totalCost: fmtCost }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyVehicleExit error:', err.message);
  }
}

async function notifyParkingTimeWarning(app, userId, sessionId, minutesLeft) {
  try {
    let templateKey;
    if (minutesLeft === 30) templateKey = 'PARKING_30MIN_WARNING';
    else if (minutesLeft === 15) templateKey = 'PARKING_15MIN_WARNING';
    else if (minutesLeft === 5) templateKey = 'PARKING_5MIN_WARNING';
    else return;

    // Anti-spam: use session+minutes as referenceId so each warning only sent once
    const notification = await notificationService.createAutoNotification(
      templateKey,
      `session_${sessionId}_${minutesLeft}min`,
      userId,
      templateKey
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyParkingTimeWarning error:', err.message);
  }
}

async function notifyParkingExpired(app, userId, sessionId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'PARKING_EXPIRED',
      `session_${sessionId}_expired`,
      userId,
      'PARKING_EXPIRED'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyParkingExpired error:', err.message);
  }
}

async function notifyParkingOvertime(app, userId, sessionId) {
  try {
    const notification = await notificationService.createAutoNotification(
      'PARKING_OVERTIME',
      `session_${sessionId}_overtime`,
      userId,
      'PARKING_OVERTIME'
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyParkingOvertime error:', err.message);
  }
}

// ─── CAMERA ─────────────────────────────────────────────────────────────────────

async function notifyPlateRecognized(app, userId, plate) {
  try {
    const notification = await notificationService.createAutoNotification(
      'PLATE_RECOGNIZED',
      `user_${userId}_plate_${Date.now()}`,
      userId,
      'PLATE_RECOGNIZED',
      { plate }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyPlateRecognized error:', err.message);
  }
}

async function notifyPlateMismatch(app, userId, expected, detected) {
  try {
    const notification = await notificationService.createAutoNotification(
      'PLATE_MISMATCH',
      `user_${userId}_mismatch_${Date.now()}`,
      userId,
      'PLATE_MISMATCH',
      { expected, detected }
    );
    if (notification) {
      const io = getIO(app);
      if (io) await emitNotification(io, userId, notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyPlateMismatch error:', err.message);
  }
}

// ─── SYSTEM ─────────────────────────────────────────────────────────────────────

async function notifySystemMaintenance(app) {
  try {
    const result = await notificationService.createBroadcastAutoNotification(
      'SYSTEM_MAINTENANCE',
      `system_maintenance_${Date.now()}`,
      'SYSTEM_MAINTENANCE'
    );
    if (result) {
      const io = getIO(app);
      if (io) broadcastNotification(io, result.notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifySystemMaintenance error:', err.message);
  }
}

async function notifyVersionUpdate(app) {
  try {
    const result = await notificationService.createBroadcastAutoNotification(
      'SYSTEM_UPDATE',
      `system_update_${Date.now()}`,
      'SYSTEM_UPDATE'
    );
    if (result) {
      const io = getIO(app);
      if (io) broadcastNotification(io, result.notification);
    }
  } catch (err) {
    console.error('[NotifTrigger] notifyVersionUpdate error:', err.message);
  }
}

module.exports = {
  // Account
  notifyRegistrationSuccess,
  notifyEmailVerified,
  notifyPasswordChanged,
  notifyAccountLocked,
  notifyAccountUnlocked,
  // Wallet
  notifyTopUpSuccess,
  notifyTopUpFailed,
  notifyRefundSuccess,
  notifyLowBalance,
  // Payment
  notifyPaymentSuccess,
  notifyPaymentFailed,
  // Booking
  notifyBookingSuccess,
  notifyBookingCancelled,
  // Parking
  notifyVehicleEntry,
  notifyVehicleExit,
  notifyParkingTimeWarning,
  notifyParkingExpired,
  notifyParkingOvertime,
  // Camera
  notifyPlateRecognized,
  notifyPlateMismatch,
  // System
  notifySystemMaintenance,
  notifyVersionUpdate,
};
