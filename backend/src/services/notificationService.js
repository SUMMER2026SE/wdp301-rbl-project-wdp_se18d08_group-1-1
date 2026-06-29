const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const NotificationEventLog = require('../models/NotificationEventLog');
const User = require('../models/User');

// ─── Notification Templates ────────────────────────────────────────────────────
const NOTIFICATION_TEMPLATES = {
  // ACCOUNT
  REGISTRATION_SUCCESS: {
    title: 'Welcome to VALO Parking!',
    content: 'Your account has been created successfully. Explore our smart parking features now!',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },
  EMAIL_VERIFIED: {
    title: 'Email verified successfully',
    content: 'Your email has been verified. You can now use all system features.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },
  PASSWORD_CHANGED: {
    title: 'Password changed successfully',
    content: 'Your password has been changed successfully. If you did not perform this action, please contact support.',
    type: 'ACCOUNT',
    priority: 'WARNING',
  },
  ACCOUNT_LOCKED: {
    title: 'Account locked',
    content: 'Your account has been locked. Please contact an administrator for more details.',
    type: 'ACCOUNT',
    priority: 'ERROR',
  },
  ACCOUNT_UNLOCKED: {
    title: 'Account unlocked',
    content: 'Your account has been unlocked. You can continue using the system.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },

  // WALLET
  TOPUP_SUCCESS: {
    title: 'Top-up successful',
    content: 'You topped up {amount} VND to your wallet. Current balance: {balance} VND.',
    type: 'WALLET',
    priority: 'SUCCESS',
  },
  TOPUP_FAILED: {
    title: 'Top-up failed',
    content: 'The top-up transaction for {amount} VND was unsuccessful. Please try again.',
    type: 'WALLET',
    priority: 'ERROR',
  },
  REFUND_SUCCESS: {
    title: 'Refund successful',
    content: '{amount} VND has been refunded to your wallet. Current balance: {balance} VND.',
    type: 'WALLET',
    priority: 'SUCCESS',
  },
  LOW_BALANCE: {
    title: 'Low balance',
    content: 'Your wallet balance is only {balance} VND. Please top up to continue using the service.',
    type: 'WALLET',
    priority: 'WARNING',
  },

  // PAYMENT
  PAYMENT_SUCCESS: {
    title: 'Payment successful',
    content: 'You paid {amount} VND for parking fees. Thank you for using VALO Parking!',
    type: 'PAYMENT',
    priority: 'SUCCESS',
  },
  PAYMENT_FAILED: {
    title: 'Payment failed',
    content: 'The payment of {amount} VND was unsuccessful. Please check your wallet balance.',
    type: 'PAYMENT',
    priority: 'ERROR',
  },

  // VIOLATION
  VIOLATION_CREATED: {
    title: 'New parking violation',
    content: 'A violation "{title}" was recorded. Fine amount: {amount} VND. Please pay within 72 hours.',
    type: 'VIOLATION',
    priority: 'WARNING',
  },
  VIOLATION_PAYMENT_REMINDER: {
    title: 'Violation payment reminder',
    content: 'Violation fine {violationId} is still unpaid. Please pay soon.',
    type: 'VIOLATION',
    priority: 'WARNING',
  },
  VIOLATION_PAID: {
    title: 'Violation fine paid',
    content: 'Your violation fine {violationId} was paid successfully. Amount: {amount} VND.',
    type: 'VIOLATION',
    priority: 'SUCCESS',
  },
  VIOLATION_CANCELLED: {
    title: 'Violation cancelled',
    content: 'Violation {violationId} has been cancelled.',
    type: 'VIOLATION',
    priority: 'INFO',
  },

  // BOOKING
  BOOKING_SUCCESS: {
    title: 'Booking successful',
    content: 'Your booking at {slotInfo} was created successfully. Please arrive on time.',
    type: 'BOOKING',
    priority: 'SUCCESS',
  },
  BOOKING_CANCELLED: {
    title: 'Booking cancelled',
    content: 'Your booking at {slotInfo} has been cancelled. {reason}',
    type: 'BOOKING',
    priority: 'WARNING',
  },
  BOOKING_CHECKIN_REMINDER: {
    title: 'Check-in reminder',
    content: 'Your booking at {slotInfo} will start in {minutes} minutes.',
    type: 'BOOKING',
    priority: 'INFO',
  },
  BOOKING_CHECKIN_EXPIRED: {
    title: 'Check-in time expired',
    content: 'You missed the check-in time for your booking at {slotInfo}. The booking may be cancelled.',
    type: 'BOOKING',
    priority: 'ERROR',
  },

  // PARKING
  VEHICLE_ENTRY: {
    title: 'Vehicle entry successful',
    content: 'Vehicle {plate} has entered the parking lot. Slot: {slot}.',
    type: 'PARKING',
    priority: 'SUCCESS',
  },
  VEHICLE_EXIT: {
    title: 'Vehicle exit successful',
    content: 'Vehicle {plate} has exited the parking lot. Total fee: {totalCost} VND. Thank you!',
    type: 'PARKING',
    priority: 'SUCCESS',
  },
  PARKING_30MIN_WARNING: {
    title: '30 minutes of parking remaining',
    content: 'Your parking session has 30 minutes remaining. Prepare to extend if needed.',
    type: 'PARKING',
    priority: 'INFO',
  },
  PARKING_15MIN_WARNING: {
    title: '15 minutes of parking remaining',
    content: 'Your parking session has 15 minutes remaining. Please move your vehicle or extend the session.',
    type: 'PARKING',
    priority: 'WARNING',
  },
  PARKING_5MIN_WARNING: {
    title: '5 minutes of parking remaining',
    content: 'Your parking session is about to expire. Only 5 minutes remain.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_EXPIRED: {
    title: 'Parking session expired',
    content: 'Your parking session has expired. Please move your vehicle now to avoid extra fees.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_OVERTIME: {
    title: 'Parking overtime',
    content: 'Your vehicle is parked overtime. Extra fees will be charged according to policy.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_OVERTIME_REPEAT: {
    title: 'Repeated parking overtime',
    content: 'Your vehicle has exceeded the parking time multiple times. Please pay attention to the session time.',
    type: 'PARKING',
    priority: 'ERROR',
  },

  // CAMERA
  PLATE_RECOGNIZED: {
    title: 'License plate recognized',
    content: 'License plate {plate} was recognized successfully.',
    type: 'CAMERA',
    priority: 'SUCCESS',
  },
  PLATE_NOT_RECOGNIZED: {
    title: 'License plate not recognized',
    content: 'The system could not recognize the license plate. Please contact staff.',
    type: 'CAMERA',
    priority: 'WARNING',
  },
  PLATE_MISMATCH: {
    title: 'License plate mismatch',
    content: 'The detected plate ({detected}) does not match the registered data ({expected}).',
    type: 'CAMERA',
    priority: 'ERROR',
  },

  // SYSTEM
  SYSTEM_MAINTENANCE: {
    title: 'System maintenance',
    content: 'The system will undergo maintenance. Some features may be temporarily unavailable.',
    type: 'SYSTEM',
    priority: 'WARNING',
  },
  SYSTEM_UPDATE: {
    title: 'New version update',
    content: 'The system has been updated to a new version with several improvements.',
    type: 'SYSTEM',
    priority: 'INFO',
  },
};

// ─── Helper: Fill template placeholders ─────────────────────────────────────────
function fillTemplate(template, data = {}) {
  let title = template.title;
  let content = template.content;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
    content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
  }

  return { title, content, type: template.type, priority: template.priority };
}

// ─── Create notification for a single user ──────────────────────────────────────
async function createForUser(userId, data, createdBy = null) {
  const notification = await Notification.create({
    title: data.title,
    content: data.content,
    type: data.type || 'SYSTEM',
    priority: data.priority || 'INFO',
    targetType: 'SINGLE_USER',
    targetUsers: [userId],
    createdBy,
    metadata: data.metadata || {},
  });

  await UserNotification.create({
    userId,
    notificationId: notification._id,
  });

  return notification;
}

// ─── Create notification for multiple users ─────────────────────────────────────
async function createForUsers(userIds, data, createdBy = null) {
  const notification = await Notification.create({
    title: data.title,
    content: data.content,
    type: data.type || 'SYSTEM',
    priority: data.priority || 'INFO',
    targetType: 'MULTI_USER',
    targetUsers: userIds,
    createdBy,
    metadata: data.metadata || {},
  });

  const userNotifs = userIds.map((uid) => ({
    userId: uid,
    notificationId: notification._id,
  }));

  await UserNotification.insertMany(userNotifs, { ordered: false }).catch(() => {
    // Ignore duplicate key errors for idempotency
  });

  return notification;
}

// ─── Create notification for all users ──────────────────────────────────────────
async function createForAllUsers(data, createdBy = null) {
  // Get all active customer user IDs
  const users = await User.find({ status: true, role: { $in: ['customer'] } })
    .select('_id')
    .lean();

  const userIds = users.map((u) => u._id);

  const notification = await Notification.create({
    title: data.title,
    content: data.content,
    type: data.type || 'SYSTEM',
    priority: data.priority || 'INFO',
    targetType: 'ALL_USERS',
    targetUsers: [],
    createdBy,
    metadata: data.metadata || {},
  });

  if (userIds.length > 0) {
    const userNotifs = userIds.map((uid) => ({
      userId: uid,
      notificationId: notification._id,
    }));

    await UserNotification.insertMany(userNotifs, { ordered: false }).catch(() => {
      // Ignore duplicate key errors
    });
  }

  return { notification, userIds };
}

// ─── Create auto notification with deduplication ────────────────────────────────
async function createAutoNotification(eventType, referenceId, userId, templateKey, templateData = {}) {
  // Check dedup
  try {
    await NotificationEventLog.create({ eventType, referenceId });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate — already sent, skip
      return null;
    }
    throw err;
  }

  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    console.error(`[NotificationService] Template not found: ${templateKey}`);
    return null;
  }

  const filled = fillTemplate(template, templateData);
  const notification = await createForUser(userId, {
    ...filled,
    metadata: { eventType, referenceId, ...templateData },
  });

  // Update event log with notificationId
  await NotificationEventLog.findOneAndUpdate(
    { eventType, referenceId },
    { notificationId: notification._id }
  );

  return notification;
}

// ─── Create broadcast auto notification ─────────────────────────────────────────
async function createBroadcastAutoNotification(eventType, referenceId, templateKey, templateData = {}) {
  try {
    await NotificationEventLog.create({ eventType, referenceId });
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    throw err;
  }

  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    console.error(`[NotificationService] Template not found: ${templateKey}`);
    return null;
  }

  const filled = fillTemplate(template, templateData);
  const result = await createForAllUsers({
    ...filled,
    metadata: { eventType, referenceId, ...templateData },
  });

  await NotificationEventLog.findOneAndUpdate(
    { eventType, referenceId },
    { notificationId: result.notification._id }
  );

  return result;
}

// ─── Get user notifications (paginated + filtered) ──────────────────────────────
async function getUserNotifications(userId, filters = {}) {
  const { page = 1, limit = 20, type, isRead, search } = filters;
  const skip = (page - 1) * limit;

  // Build match conditions on UserNotification
  const matchUser = {
    userId: userId,
    isDeleted: false,
  };
  if (isRead !== undefined) {
    matchUser.isRead = isRead === 'true' || isRead === true;
  }

  // Pipeline
  const pipeline = [
    { $match: matchUser },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'notifications',
        localField: 'notificationId',
        foreignField: '_id',
        as: 'notification',
      },
    },
    { $unwind: '$notification' },
    // Filter out revoked notifications
    { $match: { 'notification.isRevoked': false } },
  ];

  // Type filter
  if (type) {
    pipeline.push({ $match: { 'notification.type': type } });
  }

  // Search filter
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    pipeline.push({
      $match: {
        $or: [
          { 'notification.title': searchRegex },
          { 'notification.content': searchRegex },
        ],
      },
    });
  }

  // Count total (before pagination)
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await UserNotification.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Paginate
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  // Project final shape
  pipeline.push({
    $project: {
      _id: 1,
      userId: 1,
      notificationId: '$notification._id',
      title: '$notification.title',
      content: '$notification.content',
      type: '$notification.type',
      priority: '$notification.priority',
      metadata: '$notification.metadata',
      isRead: 1,
      readAt: 1,
      createdAt: 1,
      notificationCreatedAt: '$notification.createdAt',
    },
  });

  const notifications = await UserNotification.aggregate(pipeline);

  return {
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

// ─── Get unread count ───────────────────────────────────────────────────────────
async function getUnreadCount(userId) {
  const count = await UserNotification.countDocuments({
    userId,
    isRead: false,
    isDeleted: false,
  });
  return count;
}

// ─── Mark as read ───────────────────────────────────────────────────────────────
async function markAsRead(userId, notificationId) {
  const result = await UserNotification.findOneAndUpdate(
    { userId, notificationId, isDeleted: false },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return result;
}

// ─── Mark all as read ───────────────────────────────────────────────────────────
async function markAllAsRead(userId) {
  const result = await UserNotification.updateMany(
    { userId, isRead: false, isDeleted: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
}

// ─── Soft delete ────────────────────────────────────────────────────────────────
async function deleteNotification(userId, notificationId) {
  const result = await UserNotification.findOneAndUpdate(
    { userId, notificationId },
    { isDeleted: true },
    { new: true }
  );
  return result;
}

// ─── Revoke notification (admin) ────────────────────────────────────────────────
async function revokeNotification(notificationId) {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRevoked: true },
    { new: true }
  );
  return notification;
}

async function markAdminNotificationAsRead(adminId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      'adminReadBy.userId': { $ne: adminId },
    },
    {
      $push: {
        adminReadBy: {
          userId: adminId,
          readAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return notification || Notification.findById(notificationId);
}

async function markAllAdminNotificationsAsRead(adminId) {
  return Notification.updateMany(
    {
      isRevoked: false,
      'adminDeletedBy.userId': { $ne: adminId },
      'adminReadBy.userId': { $ne: adminId },
    },
    {
      $push: {
        adminReadBy: {
          userId: adminId,
          readAt: new Date(),
        },
      },
    }
  );
}

async function deleteAdminNotification(adminId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      'adminDeletedBy.userId': { $ne: adminId },
    },
    {
      $push: {
        adminDeletedBy: {
          userId: adminId,
          deletedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return notification || Notification.findById(notificationId);
}

// ─── Get admin notification history ─────────────────────────────────────────────
async function getAdminNotifications(filters = {}) {
  const { page = 1, limit = 20, type, priority, search, adminId } = filters;
  const skip = (page - 1) * limit;

  const query = { isRevoked: false };
  if (adminId) {
    query['adminDeletedBy.userId'] = { $ne: adminId };
  }
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    const matchedUsers = await User.find({
      $or: [
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('_id')
      .lean();
    const matchedUserIds = matchedUsers.map((user) => user._id);

    query.$or = [
      { title: searchRegex },
      { content: searchRegex },
      { createdBy: { $in: matchedUserIds } },
      { targetUsers: { $in: matchedUserIds } },
    ];
  }

  const [notifications, total, successCount, errorCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('targetUsers', 'username email')
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, priority: { $in: ['SUCCESS', 'INFO', 'SYSTEM'] } }),
    Notification.countDocuments({ ...query, priority: { $in: ['ERROR', 'WARNING'] } })
  ]);

  const notificationsWithAdminState = notifications.map((notification) => ({
    ...notification,
    isRead: adminId
      ? (notification.adminReadBy || []).some((item) => String(item.userId) === String(adminId))
      : false,
  }));

  return {
    notifications: notificationsWithAdminState,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
    stats: {
      totalSent: total,
      success: successCount,
      errors: errorCount,
    }
  };
}

module.exports = {
  NOTIFICATION_TEMPLATES,
  fillTemplate,
  createForUser,
  createForUsers,
  createForAllUsers,
  createAutoNotification,
  createBroadcastAutoNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  revokeNotification,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
  getAdminNotifications,
};
