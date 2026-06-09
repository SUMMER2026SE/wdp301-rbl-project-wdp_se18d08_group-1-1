const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const NotificationRule = require('../models/NotificationRule');

const DEFAULT_RULES = [
  // ─── Tài khoản ────────────────────────────────────────
  {
    eventKey: 'account.registered',
    group: 'Tài khoản',
    name: 'Đăng ký thành công',
    description: 'Khi user tạo tài khoản mới.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 30,
  },
  {
    eventKey: 'account.email_verified',
    group: 'Tài khoản',
    name: 'Xác thực email thành công',
    description: 'Khi user xác thực email.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 45,
  },
  {
    eventKey: 'account.password_changed',
    group: 'Tài khoản',
    name: 'Đổi mật khẩu',
    description: 'Bảo mật: thông báo mọi lần đổi mật khẩu.',
    priority: 'INFO',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 60,
  },
  {
    eventKey: 'account.locked',
    group: 'Tài khoản',
    name: 'Tài khoản bị khóa',
    description: 'Khi tài khoản bị khóa bởi admin.',
    priority: 'ERROR',
    enabled: true,
    channels: ['In-app', 'Email', 'SMS'],
    throttleMinutes: 10,
  },
  {
    eventKey: 'account.unlocked',
    group: 'Tài khoản',
    name: 'Tài khoản được mở khóa',
    description: 'Khi tài khoản được admin mở khóa.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 10,
  },

  // ─── Ví ───────────────────────────────────────────────
  {
    eventKey: 'wallet.topup_success',
    group: 'Ví',
    name: 'Nạp tiền thành công',
    description: 'Khi nạp tiền vào ví thành công.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'wallet.topup_failed',
    group: 'Ví',
    name: 'Nạp tiền thất bại',
    description: 'Khi giao dịch nạp tiền bị lỗi.',
    priority: 'ERROR',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'wallet.payment_success',
    group: 'Ví',
    name: 'Thanh toán thành công',
    description: 'Khi thanh toán phí đỗ xe thành công.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'wallet.payment_failed',
    group: 'Ví',
    name: 'Thanh toán thất bại',
    description: 'Khi thanh toán không đủ số dư.',
    priority: 'ERROR',
    enabled: true,
    channels: ['In-app'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'wallet.refund_success',
    group: 'Ví',
    name: 'Hoàn tiền thành công',
    description: 'Khi hoàn tiền vào ví thành công.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 10,
  },
  {
    eventKey: 'wallet.low_balance',
    group: 'Ví',
    name: 'Số dư thấp',
    description: 'Khi số dư ví dưới 30.000đ.',
    priority: 'WARNING',
    enabled: true,
    channels: ['In-app', 'SMS'],
    throttleMinutes: 60,
  },

  // ─── Đỗ xe ────────────────────────────────────────────
  {
    eventKey: 'parking.entry',
    group: 'Đỗ xe',
    name: 'Xe vào bãi',
    description: 'Khi xe được ghi nhận vào bãi đỗ.',
    priority: 'INFO',
    enabled: true,
    channels: ['In-app'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'parking.exit',
    group: 'Đỗ xe',
    name: 'Xe ra bãi',
    description: 'Khi xe rời bãi đỗ.',
    priority: 'INFO',
    enabled: true,
    channels: ['In-app'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'parking.remaining_30',
    group: 'Đỗ xe',
    name: 'Còn 30 phút',
    description: 'Cảnh báo phiên đỗ xe còn 30 phút.',
    priority: 'INFO',
    enabled: true,
    channels: ['In-app', 'Push'],
    throttleMinutes: 10,
  },
  {
    eventKey: 'parking.remaining_15',
    group: 'Đỗ xe',
    name: 'Còn 15 phút',
    description: 'Cảnh báo phiên đỗ xe còn 15 phút.',
    priority: 'WARNING',
    enabled: true,
    channels: ['In-app', 'Push'],
    throttleMinutes: 10,
  },
  {
    eventKey: 'parking.remaining_5',
    group: 'Đỗ xe',
    name: 'Còn 5 phút',
    description: 'Cảnh báo khẩn: phiên đỗ xe còn 5 phút.',
    priority: 'WARNING',
    enabled: true,
    channels: ['In-app', 'Push'],
    throttleMinutes: 5,
  },
  {
    eventKey: 'parking.expired',
    group: 'Đỗ xe',
    name: 'Hết giờ đỗ',
    description: 'Phiên đỗ xe đã hết hạn.',
    priority: 'ERROR',
    enabled: true,
    channels: ['In-app', 'Email', 'Push', 'SMS'],
    throttleMinutes: 10,
  },

  // ─── Đặt chỗ ──────────────────────────────────────────
  {
    eventKey: 'booking.checkin_overdue',
    group: 'Đặt chỗ',
    name: 'Quá giờ check-in',
    description: 'Khi khách hàng quá giờ check-in đặt chỗ.',
    priority: 'WARNING',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 15,
  },
  {
    eventKey: 'booking.created',
    group: 'Đặt chỗ',
    name: 'Đặt chỗ thành công',
    description: 'Khi tạo booking mới thành công.',
    priority: 'SUCCESS',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 10,
  },
  {
    eventKey: 'booking.cancelled',
    group: 'Đặt chỗ',
    name: 'Đặt chỗ bị hủy',
    description: 'Khi booking bị hủy.',
    priority: 'WARNING',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 10,
  },

  // ─── Hệ thống ─────────────────────────────────────────
  {
    eventKey: 'system.maintenance',
    group: 'Hệ thống',
    name: 'Bảo trì hệ thống',
    description: 'Thông báo bảo trì hệ thống cho toàn bộ user.',
    priority: 'SYSTEM',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 60,
  },
  {
    eventKey: 'system.update',
    group: 'Hệ thống',
    name: 'Cập nhật phiên bản',
    description: 'Thông báo phiên bản mới.',
    priority: 'INFO',
    enabled: true,
    channels: ['In-app', 'Email'],
    throttleMinutes: 120,
  },
];

async function seedRules() {
  try {
    console.log('🌱 Seeding notification rules...');

    for (const rule of DEFAULT_RULES) {
      await NotificationRule.findOneAndUpdate(
        { eventKey: rule.eventKey },
        { $setOnInsert: rule },
        { upsert: true, new: true }
      );
    }

    const count = await NotificationRule.countDocuments();
    console.log(`✅ Notification rules seeded. Total rules: ${count}`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  }
}

// Allow running directly: node src/seeds/notificationRuleSeeder.js
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedRules();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}

module.exports = { seedRules, DEFAULT_RULES };
