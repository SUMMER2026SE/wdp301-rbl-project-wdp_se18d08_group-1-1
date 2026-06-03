/**
 * Notification Seed Script
 *
 * Creates sample notifications for testing.
 * Usage: node src/seeds/notificationSeed.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const NotificationEventLog = require('../models/NotificationEventLog');

const SAMPLE_NOTIFICATIONS = [
  // SYSTEM broadcasts
  {
    title: 'Chào mừng đến với VALO Parking!',
    content: 'Hệ thống đỗ xe thông minh VALO đã sẵn sàng phục vụ bạn. Khám phá các tính năng ngay!',
    type: 'SYSTEM',
    priority: 'INFO',
    targetType: 'ALL_USERS',
  },
  {
    title: 'Cập nhật phiên bản v2.0',
    content: 'VALO Parking v2.0 đã ra mắt với nhiều tính năng mới: thanh toán QR, nhận diện biển số AI, và hơn thế nữa!',
    type: 'SYSTEM',
    priority: 'SUCCESS',
    targetType: 'ALL_USERS',
  },
  {
    title: 'Bảo trì hệ thống định kỳ',
    content: 'Hệ thống sẽ bảo trì từ 2:00 AM - 4:00 AM ngày 15/06. Một số tính năng có thể tạm ngưng.',
    type: 'SYSTEM',
    priority: 'WARNING',
    targetType: 'ALL_USERS',
  },

  // Per-user notifications (will be assigned to first customer)
  {
    title: 'Nạp tiền thành công',
    content: 'Bạn đã nạp 500,000 VNĐ vào ví. Số dư hiện tại: 1,200,000 VNĐ.',
    type: 'WALLET',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Xe vào bãi thành công',
    content: 'Xe 51G-12345 đã vào bãi đỗ, vị trí: A-05. Chúc bạn có trải nghiệm tốt!',
    type: 'PARKING',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Còn 30 phút đỗ xe',
    content: 'Phiên đỗ xe của bạn còn 30 phút. Hãy chuẩn bị nếu cần gia hạn.',
    type: 'PARKING',
    priority: 'INFO',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Thanh toán phí đỗ xe thành công',
    content: 'Bạn đã thanh toán 35,000 VNĐ cho phí đỗ xe. Cảm ơn bạn đã sử dụng VALO Parking!',
    type: 'PAYMENT',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Đặt chỗ thành công',
    content: 'Bạn đã đặt chỗ thành công tại khu vực B, vị trí B-12. Hãy đến đúng giờ nhé!',
    type: 'BOOKING',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Xác thực email thành công',
    content: 'Email của bạn đã được xác thực. Bạn có thể sử dụng đầy đủ các tính năng của hệ thống.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Số dư thấp',
    content: 'Số dư ví của bạn chỉ còn 15,000 VNĐ. Hãy nạp thêm để tiếp tục sử dụng dịch vụ.',
    type: 'WALLET',
    priority: 'WARNING',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Nhận diện biển số thành công',
    content: 'Biển số 51G-12345 đã được nhận diện thành công tại cổng vào.',
    type: 'CAMERA',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Khuyến mãi cuối tuần',
    content: 'Giảm 20% phí đỗ xe vào cuối tuần này! Áp dụng từ thứ 6 đến Chủ nhật.',
    type: 'PROMOTION',
    priority: 'INFO',
    targetType: 'ALL_USERS',
  },
];

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Find customers
    const customers = await User.find({ role: 'customer', status: true }).limit(5).lean();

    if (customers.length === 0) {
      console.log('⚠️  No customers found. Creating notifications for ALL_USERS only.');
    }

    const firstCustomer = customers[0] || null;
    let createdCount = 0;

    for (const sample of SAMPLE_NOTIFICATIONS) {
      const notifData = {
        title: sample.title,
        content: sample.content,
        type: sample.type,
        priority: sample.priority,
        targetType: sample.targetType,
        targetUsers: [],
        createdBy: null,
        metadata: {},
      };

      if (sample.targetType === 'ALL_USERS') {
        // Broadcast
        const notification = await Notification.create(notifData);

        // Create UserNotification for all customers
        const userNotifs = customers.map((c) => ({
          userId: c._id,
          notificationId: notification._id,
        }));

        if (userNotifs.length > 0) {
          await UserNotification.insertMany(userNotifs, { ordered: false }).catch(() => {});
        }

        createdCount++;
      } else if (sample.targetType === 'SINGLE_USER' && firstCustomer) {
        notifData.targetUsers = [firstCustomer._id];
        const notification = await Notification.create(notifData);

        await UserNotification.create({
          userId: firstCustomer._id,
          notificationId: notification._id,
        }).catch(() => {});

        createdCount++;
      }
    }

    console.log(`\n✅ Seeded ${createdCount} notifications`);
    console.log(`   Customers found: ${customers.length}`);
    if (firstCustomer) {
      console.log(`   Per-user notifications assigned to: ${firstCustomer.email}`);
    }

    // Stats
    const totalNotifs = await Notification.countDocuments();
    const totalUserNotifs = await UserNotification.countDocuments();
    console.log(`\n📊 Database stats:`);
    console.log(`   Notifications: ${totalNotifs}`);
    console.log(`   UserNotifications: ${totalUserNotifs}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seed();
