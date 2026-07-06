const NotificationEventLog = require('../models/NotificationEventLog');
const NotificationRule = require('../models/NotificationRule');
const Subscription = require('../models/Subscription');
const notificationService = require('./notificationService');
const notificationEmailService = require('./notificationEmailService');
const { emitNotification } = require('../sockets/notificationSocket');

const DEFAULT_CHECK_INTERVAL_MS = Number(process.env.AUTO_RULE_CHECK_INTERVAL_MS) || 5 * 60 * 1000;
const DEFAULT_EXPIRY_OFFSET_MINUTES = 3 * 24 * 60;

let automationInterval = null;

function normalizeChannels(channels) {
  const safe = Array.isArray(channels) ? channels.filter((channel) => ['In-app', 'Email'].includes(channel)) : [];
  return [...new Set(['In-app', ...safe])];
}

function inferNotificationType(rule) {
  const source = String(rule.triggerConfig?.source || rule.eventKey || '').toLowerCase();
  const group = String(rule.group || '').toUpperCase();

  if (source.startsWith('subscription.') || group.includes('SUBSCRIPTION') || group.includes('MEMBERSHIP')) {
    return 'SUBSCRIPTION';
  }
  if (group.includes('PARKING')) return 'PARKING';
  if (group.includes('BOOKING')) return 'BOOKING';
  if (group.includes('WALLET')) return 'WALLET';
  if (group.includes('ACCOUNT')) return 'ACCOUNT';
  return 'SYSTEM';
}

function getOffsetMinutes(rule) {
  const configured = Number(rule.triggerConfig?.offsetMinutes);
  if (Number.isFinite(configured) && configured > 0) return Math.round(configured);

  const key = String(rule.eventKey || '');
  const match = key.match(/(?:expiring|remaining|before)[._-](\d+)(m|h|d)?/i);
  if (!match) return DEFAULT_EXPIRY_OFFSET_MINUTES;

  const amount = Number(match[1]);
  const unit = (match[2] || 'd').toLowerCase();
  if (unit === 'm') return amount;
  if (unit === 'h') return amount * 60;
  return amount * 24 * 60;
}

function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function fillRuleText(text, data) {
  return String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function buildPayload(rule, data) {
  const fallbackTitle = rule.name || 'Automatic notification';
  const fallbackContent = rule.description || 'A configured automation rule was triggered.';

  return {
    title: fillRuleText(fallbackTitle, data),
    content: fillRuleText(fallbackContent, data),
    type: inferNotificationType(rule),
    priority: rule.priority || 'INFO',
    metadata: {
      eventType: rule.eventKey,
      source: rule.triggerConfig?.source,
      ...data,
    },
  };
}

async function createRuleNotification(app, rule, userId, referenceId, data) {
  try {
    await NotificationEventLog.create({
      eventType: rule.eventKey,
      referenceId,
    });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }

  const payload = buildPayload(rule, data);
  const notification = await notificationService.createForUser(userId, payload);

  await NotificationEventLog.findOneAndUpdate(
    { eventType: rule.eventKey, referenceId },
    { notificationId: notification._id }
  );

  const io = app?.get('io');
  if (io) await emitNotification(io, userId, notification);

  if (normalizeChannels(rule.channels).includes('Email')) {
    notificationEmailService.sendCustomNotificationEmail(userId, rule, payload, data);
  }

  return notification;
}

async function runSubscriptionExpiringRule(app, rule) {
  const offsetMinutes = getOffsetMinutes(rule);
  const lookbackMinutes = Math.max(1, Number(rule.triggerConfig?.lookbackMinutes) || 15);
  const now = new Date();
  const lowerBound = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
  const horizon = new Date(now.getTime() + offsetMinutes * 60 * 1000);

  const subscriptions = await Subscription.find({
    status: 'active',
    paymentStatus: 'paid',
    expireAt: { $gte: lowerBound, $lte: horizon },
  })
    .populate('user', 'username email status role membership')
    .populate('ticketPackage', 'name type price')
    .lean();

  let sent = 0;

  for (const subscription of subscriptions) {
    const user = subscription.user;
    if (!user || user.status === false || user.role !== 'customer') continue;

    const minutesLeft = Math.max(0, Math.ceil((new Date(subscription.expireAt).getTime() - now.getTime()) / 60000));
    const daysLeft = Math.ceil(minutesLeft / (24 * 60));
    const hoursLeft = Math.ceil(minutesLeft / 60);
    const packageInfo = subscription.ticketPackage || {};

    const data = {
      subscriptionId: String(subscription._id),
      packageName: packageInfo.name || 'VIP package',
      packageType: packageInfo.type || 'subscription',
      packagePrice: Number(packageInfo.price || subscription.amount || 0).toLocaleString('vi-VN'),
      expireAt: formatDateTime(subscription.expireAt),
      daysLeft,
      hoursLeft,
      minutesLeft,
    };

    const notification = await createRuleNotification(
      app,
      rule,
      user._id,
      `subscription_${subscription._id}_${offsetMinutes}`,
      data
    );

    if (notification) sent += 1;
  }

  return sent;
}

const SOURCE_HANDLERS = {
  'subscription.expiring': runSubscriptionExpiringRule,
};

async function runScheduledRules(app) {
  const rules = await NotificationRule.find({
    deletedAt: null,
    enabled: true,
    triggerType: 'scheduled',
    'triggerConfig.source': { $exists: true, $nin: [null, '', 'none'] },
  }).lean();

  let totalSent = 0;

  for (const rule of rules) {
    const source = rule.triggerConfig?.source;
    const handler = SOURCE_HANDLERS[source];
    if (!handler) {
      console.warn(`[AutomationRuleEngine] No handler registered for source "${source}" (${rule.eventKey})`);
      continue;
    }

    try {
      const sent = await handler(app, rule);
      totalSent += sent;
      if (sent > 0) {
        await NotificationRule.findOneAndUpdate(
          { eventKey: rule.eventKey, deletedAt: null },
          { lastTriggeredAt: new Date() }
        );
      }
    } catch (err) {
      console.error(`[AutomationRuleEngine] ${rule.eventKey} failed:`, err.message);
    }
  }

  return totalSent;
}

function startAutomationRuleScheduler(app) {
  if (automationInterval) {
    console.log('[AutomationRuleEngine] Scheduler already running, skipping start.');
    return;
  }

  console.log(`[AutomationRuleEngine] Scheduler started (interval: ${DEFAULT_CHECK_INTERVAL_MS / 1000}s)`);

  runScheduledRules(app).catch((err) =>
    console.error('[AutomationRuleEngine] Initial run error:', err.message)
  );

  automationInterval = setInterval(() => {
    runScheduledRules(app).catch((err) =>
      console.error('[AutomationRuleEngine] Interval run error:', err.message)
    );
  }, DEFAULT_CHECK_INTERVAL_MS);
}

function stopAutomationRuleScheduler() {
  if (!automationInterval) return;
  clearInterval(automationInterval);
  automationInterval = null;
  console.log('[AutomationRuleEngine] Scheduler stopped.');
}

module.exports = {
  runScheduledRules,
  startAutomationRuleScheduler,
  stopAutomationRuleScheduler,
  SOURCE_HANDLERS,
};
