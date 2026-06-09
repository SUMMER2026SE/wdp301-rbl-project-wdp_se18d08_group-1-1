/**
 * Basic unit tests for Notification Service
 *
 * Usage: node src/tests/notificationService.test.js
 *
 * This is a simple test runner that connects to the DB,
 * runs tests, then cleans up. No external test framework needed.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const NotificationEventLog = require('../models/NotificationEventLog');
const notificationService = require('../services/notificationService');

// Test tracking
let passed = 0;
let failed = 0;
const testIds = []; // Track created docs for cleanup

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

async function cleanup() {
  // Remove test notifications
  for (const id of testIds) {
    await Notification.findByIdAndDelete(id).catch(() => {});
    await UserNotification.deleteMany({ notificationId: id }).catch(() => {});
    await NotificationEventLog.deleteMany({ notificationId: id }).catch(() => {});
  }
  // Also clean up by test markers
  await NotificationEventLog.deleteMany({ eventType: /^TEST_/ }).catch(() => {});
}

async function runTests() {
  try {
    console.log('\n🧪 Notification Service Tests\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    // Find or create a test user
    let testUser = await User.findOne({ role: 'customer', status: true });
    if (!testUser) {
      console.log('⚠️  No customer found in DB. Some tests will be skipped.');
      await cleanup();
      process.exit(0);
    }

    const userId = testUser._id;

    // ── Test 1: createForUser ──
    console.log('Test: createForUser');
    const notif1 = await notificationService.createForUser(userId, {
      title: 'Test Notification',
      content: 'This is a test notification',
      type: 'SYSTEM',
      priority: 'INFO',
    });
    testIds.push(notif1._id);
    assert(notif1 !== null, 'Notification created');
    assert(notif1.title === 'Test Notification', 'Title matches');
    assert(notif1.targetType === 'SINGLE_USER', 'Target type is SINGLE_USER');

    const userNotif1 = await UserNotification.findOne({ userId, notificationId: notif1._id });
    assert(userNotif1 !== null, 'UserNotification created');
    assert(userNotif1.isRead === false, 'isRead defaults to false');
    assert(userNotif1.isDeleted === false, 'isDeleted defaults to false');

    // ── Test 2: getUnreadCount ──
    console.log('\nTest: getUnreadCount');
    const count1 = await notificationService.getUnreadCount(userId);
    assert(count1 >= 1, `Unread count >= 1 (got ${count1})`);

    // ── Test 3: markAsRead ──
    console.log('\nTest: markAsRead');
    const readResult = await notificationService.markAsRead(userId, notif1._id);
    assert(readResult !== null, 'markAsRead returns result');
    assert(readResult.isRead === true, 'isRead is now true');
    assert(readResult.readAt !== null, 'readAt is set');

    const count2 = await notificationService.getUnreadCount(userId);
    assert(count2 < count1, `Unread count decreased (was ${count1}, now ${count2})`);

    // ── Test 4: markAllAsRead ──
    console.log('\nTest: markAllAsRead');
    // Create another unread notification
    const notif2 = await notificationService.createForUser(userId, {
      title: 'Test Notification 2',
      content: 'Another test',
      type: 'WALLET',
      priority: 'SUCCESS',
    });
    testIds.push(notif2._id);

    await notificationService.markAllAsRead(userId);
    const count3 = await notificationService.getUnreadCount(userId);
    assert(count3 === 0, `All read — unread count is 0 (got ${count3})`);

    // ── Test 5: deleteNotification (soft delete) ──
    console.log('\nTest: deleteNotification (soft)');
    const delResult = await notificationService.deleteNotification(userId, notif2._id);
    assert(delResult !== null, 'deleteNotification returns result');
    assert(delResult.isDeleted === true, 'isDeleted is now true');

    // ── Test 6: getUserNotifications ──
    console.log('\nTest: getUserNotifications');
    const result = await notificationService.getUserNotifications(userId, { page: 1, limit: 10 });
    assert(result.notifications !== undefined, 'Returns notifications array');
    assert(result.pagination !== undefined, 'Returns pagination object');
    assert(result.pagination.page === 1, 'Page is 1');
    // notif2 should be excluded (isDeleted)
    const hasDeleted = result.notifications.some(
      (n) => n.notificationId?.toString() === notif2._id.toString()
    );
    assert(!hasDeleted, 'Deleted notification not in results');

    // ── Test 7: Deduplication ──
    console.log('\nTest: Deduplication');
    const dedup1 = await notificationService.createAutoNotification(
      'TEST_DEDUP',
      'test_ref_123',
      userId,
      'REGISTRATION_SUCCESS'
    );
    if (dedup1) testIds.push(dedup1._id);
    assert(dedup1 !== null, 'First auto notification created');

    const dedup2 = await notificationService.createAutoNotification(
      'TEST_DEDUP',
      'test_ref_123',
      userId,
      'REGISTRATION_SUCCESS'
    );
    assert(dedup2 === null, 'Duplicate auto notification returns null (dedup works)');

    // ── Test 8: revokeNotification ──
    console.log('\nTest: revokeNotification');
    const notif3 = await notificationService.createForUser(userId, {
      title: 'Will be revoked',
      content: 'This will be revoked',
      type: 'SYSTEM',
      priority: 'INFO',
    });
    testIds.push(notif3._id);

    const revoked = await notificationService.revokeNotification(notif3._id);
    assert(revoked !== null, 'revokeNotification returns result');
    assert(revoked.isRevoked === true, 'isRevoked is now true');

    // Revoked notification should not appear in user's list
    const result2 = await notificationService.getUserNotifications(userId, { page: 1, limit: 100 });
    const hasRevoked = result2.notifications.some(
      (n) => n.notificationId?.toString() === notif3._id.toString()
    );
    assert(!hasRevoked, 'Revoked notification not in user results');

    // ── Test 9: fillTemplate ──
    console.log('\nTest: fillTemplate');
    const template = notificationService.NOTIFICATION_TEMPLATES.TOPUP_SUCCESS;
    const filled = notificationService.fillTemplate(template, {
      amount: '500,000',
      balance: '1,200,000',
    });
    assert(filled.title.includes('Nạp tiền thành công'), 'Template title filled');
    assert(filled.content.includes('500,000'), 'Amount placeholder filled');
    assert(filled.content.includes('1,200,000'), 'Balance placeholder filled');

    // ── Summary ──
    console.log('\n' + '─'.repeat(40));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await cleanup();
    console.log('Done\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test error:', error);
    await cleanup().catch(() => {});
    process.exit(1);
  }
}

runTests();
