const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const NotificationEventLog = require('../models/NotificationEventLog');
const User = require('../models/User');

// ─── Notification Templates ────────────────────────────────────────────────────
const NOTIFICATION_TEMPLATES = {
  // ACCOUNT
  REGISTRATION_SUCCESS: {
    title: 'Chào mừng bạn đến với VALO Parking!',
    content: 'Tài khoản của bạn đã được tạo thành công. Khám phá các tính năng thông minh của chúng tôi ngay!',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },
  EMAIL_VERIFIED: {
    title: 'Xác thực email thành công',
    content: 'Email của bạn đã được xác thực. Bạn có thể sử dụng đầy đủ các tính năng của hệ thống.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },
  PASSWORD_CHANGED: {
    title: 'Đổi mật khẩu thành công',
    content: 'Mật khẩu của bạn đã được thay đổi thành công. Nếu bạn không thực hiện thao tác này, vui lòng liên hệ hỗ trợ.',
    type: 'ACCOUNT',
    priority: 'WARNING',
  },
  ACCOUNT_LOCKED: {
    title: 'Tài khoản bị khóa',
    content: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.',
    type: 'ACCOUNT',
    priority: 'ERROR',
  },
  ACCOUNT_UNLOCKED: {
    title: 'Tài khoản được mở khóa',
    content: 'Tài khoản của bạn đã được mở khóa. Bạn có thể tiếp tục sử dụng hệ thống.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
  },

  // WALLET
  TOPUP_SUCCESS: {
    title: 'Nạp tiền thành công',
    content: 'Bạn đã nạp {amount} VNĐ vào ví. Số dư hiện tại: {balance} VNĐ.',
    type: 'WALLET',
    priority: 'SUCCESS',
  },
  TOPUP_FAILED: {
    title: 'Nạp tiền thất bại',
    content: 'Giao dịch nạp {amount} VNĐ không thành công. Vui lòng thử lại.',
    type: 'WALLET',
    priority: 'ERROR',
  },
  REFUND_SUCCESS: {
    title: 'Hoàn tiền thành công',
    content: 'Bạn đã được hoàn {amount} VNĐ vào ví. Số dư hiện tại: {balance} VNĐ.',
    type: 'WALLET',
    priority: 'SUCCESS',
  },
  LOW_BALANCE: {
    title: 'Số dư thấp',
    content: 'Số dư ví của bạn chỉ còn {balance} VNĐ. Hãy nạp thêm để tiếp tục sử dụng dịch vụ.',
    type: 'WALLET',
    priority: 'WARNING',
  },

  // PAYMENT
  PAYMENT_SUCCESS: {
    title: 'Thanh toán thành công',
    content: 'Bạn đã thanh toán {amount} VNĐ cho phí đỗ xe. Cảm ơn bạn đã sử dụng VALO Parking!',
    type: 'PAYMENT',
    priority: 'SUCCESS',
  },
  PAYMENT_FAILED: {
    title: 'Thanh toán thất bại',
    content: 'Thanh toán {amount} VNĐ không thành công. Vui lòng kiểm tra số dư ví.',
    type: 'PAYMENT',
    priority: 'ERROR',
  },

  // BOOKING
  BOOKING_SUCCESS: {
    title: 'Đặt chỗ thành công',
    content: 'Bạn đã đặt chỗ thành công tại {slotInfo}. Hãy đến đúng giờ nhé!',
    type: 'BOOKING',
    priority: 'SUCCESS',
  },
  BOOKING_CANCELLED: {
    title: 'Đặt chỗ bị hủy',
    content: 'Đặt chỗ tại {slotInfo} đã bị hủy. {reason}',
    type: 'BOOKING',
    priority: 'WARNING',
  },
  BOOKING_CHECKIN_REMINDER: {
    title: 'Sắp đến giờ check-in',
    content: 'Đặt chỗ của bạn tại {slotInfo} sẽ bắt đầu trong {minutes} phút nữa.',
    type: 'BOOKING',
    priority: 'INFO',
  },
  BOOKING_CHECKIN_EXPIRED: {
    title: 'Quá thời gian check-in',
    content: 'Bạn đã quá giờ check-in cho đặt chỗ tại {slotInfo}. Đặt chỗ có thể bị hủy.',
    type: 'BOOKING',
    priority: 'ERROR',
  },

  // PARKING
  VEHICLE_ENTRY: {
    title: 'Xe vào bãi thành công',
    content: 'Xe {plate} đã vào bãi đỗ, vị trí: {slot}. Chúc bạn có trải nghiệm tốt!',
    type: 'PARKING',
    priority: 'SUCCESS',
  },
  VEHICLE_EXIT: {
    title: 'Xe ra bãi thành công',
    content: 'Xe {plate} đã ra bãi. Tổng phí: {totalCost} VNĐ. Cảm ơn bạn!',
    type: 'PARKING',
    priority: 'SUCCESS',
  },
  PARKING_30MIN_WARNING: {
    title: 'Còn 30 phút đỗ xe',
    content: 'Phiên đỗ xe của bạn còn 30 phút. Hãy chuẩn bị nếu cần gia hạn.',
    type: 'PARKING',
    priority: 'INFO',
  },
  PARKING_15MIN_WARNING: {
    title: 'Còn 15 phút đỗ xe',
    content: 'Phiên đỗ xe của bạn còn 15 phút. Vui lòng di chuyển xe hoặc gia hạn.',
    type: 'PARKING',
    priority: 'WARNING',
  },
  PARKING_5MIN_WARNING: {
    title: 'Còn 5 phút đỗ xe',
    content: 'Phiên đỗ xe sắp hết hạn! Chỉ còn 5 phút.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_EXPIRED: {
    title: 'Hết giờ đỗ xe',
    content: 'Phiên đỗ xe của bạn đã hết hạn. Vui lòng di chuyển xe ngay để tránh phụ phí.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_OVERTIME: {
    title: 'Quá giờ đỗ xe',
    content: 'Xe của bạn đang đỗ quá giờ. Phụ phí sẽ được tính theo quy định.',
    type: 'PARKING',
    priority: 'ERROR',
  },
  PARKING_OVERTIME_REPEAT: {
    title: 'Vượt quá thời gian nhiều lần',
    content: 'Xe của bạn đã vi phạm quá giờ đỗ xe nhiều lần. Vui lòng chú ý thời gian.',
    type: 'PARKING',
    priority: 'ERROR',
  },

  // CAMERA
  PLATE_RECOGNIZED: {
    title: 'Nhận diện biển số thành công',
    content: 'Biển số {plate} đã được nhận diện thành công.',
    type: 'CAMERA',
    priority: 'SUCCESS',
  },
  PLATE_NOT_RECOGNIZED: {
    title: 'Không nhận diện được biển số',
    content: 'Hệ thống không nhận diện được biển số xe. Vui lòng liên hệ nhân viên.',
    type: 'CAMERA',
    priority: 'WARNING',
  },
  PLATE_MISMATCH: {
    title: 'Biển số không khớp',
    content: 'Biển số phát hiện ({detected}) không khớp với dữ liệu đăng ký ({expected}).',
    type: 'CAMERA',
    priority: 'ERROR',
  },

  // SYSTEM
  SYSTEM_MAINTENANCE: {
    title: 'Bảo trì hệ thống',
    content: 'Hệ thống sẽ được bảo trì. Một số tính năng có thể tạm ngưng.',
    type: 'SYSTEM',
    priority: 'WARNING',
  },
  SYSTEM_UPDATE: {
    title: 'Cập nhật phiên bản mới',
    content: 'Hệ thống đã được cập nhật phiên bản mới với nhiều cải tiến.',
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

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('targetUsers', 'username email')
      .lean(),
    Notification.countDocuments(query),
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
