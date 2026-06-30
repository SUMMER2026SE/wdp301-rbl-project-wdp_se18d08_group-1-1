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
    title: 'Welcome to VALO Parking!',
    content: 'The VALO smart parking system is ready to serve you. Explore the features now!',
    type: 'SYSTEM',
    priority: 'INFO',
    targetType: 'ALL_USERS',
  },
  {
    title: 'Version update v2.0',
    content: 'VALO Parking v2.0 is live with new features: QR payment, AI license plate recognition, and more!',
    type: 'SYSTEM',
    priority: 'SUCCESS',
    targetType: 'ALL_USERS',
  },
  {
    title: 'Scheduled system maintenance',
    content: 'The system will be under maintenance from 2:00 AM to 4:00 AM on June 15. Some features may be temporarily unavailable.',
    type: 'SYSTEM',
    priority: 'WARNING',
    targetType: 'ALL_USERS',
  },

  // Per-user notifications (will be assigned to first customer)
  {
    title: 'Top-up successful',
    content: 'You topped up 500,000 VND to your wallet. Current balance: 1,200,000 VND.',
    type: 'WALLET',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Vehicle entry successful',
    content: 'Vehicle 51G-12345 entered the parking lot at slot A-05. Have a great experience!',
    type: 'PARKING',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: '30 minutes of parking left',
    content: 'Your parking session has 30 minutes left. Please prepare if you need an extension.',
    type: 'PARKING',
    priority: 'INFO',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Parking fee payment successful',
    content: 'You paid 35,000 VND for parking. Thank you for using VALO Parking!',
    type: 'PAYMENT',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Booking successful',
    content: 'You successfully booked area B, slot B-12. Please arrive on time!',
    type: 'BOOKING',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Email verified successfully',
    content: 'Your email has been verified. You can now use all system features.',
    type: 'ACCOUNT',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Low balance',
    content: 'Your wallet balance is only 15,000 VND. Please top up to continue using services.',
    type: 'WALLET',
    priority: 'WARNING',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'License plate recognized successfully',
    content: 'License plate 51G-12345 was recognized successfully at the entrance gate.',
    type: 'CAMERA',
    priority: 'SUCCESS',
    targetType: 'SINGLE_USER',
  },
  {
    title: 'Weekend promotion',
    content: 'Get 20% off parking fees this weekend! Applies from Friday to Sunday.',
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
