import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

import { colors } from '@/theme';
import type { NotificationPriority, NotificationType, UserNotification } from '@/types/models';

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ' | NotificationType;

export const NOTIFICATION_TYPES: NotificationType[] = [
  'SYSTEM',
  'PARKING',
  'BOOKING',
  'WALLET',
  'PAYMENT',
  'ACCOUNT',
  'PROMOTION',
  'CAMERA',
  'VIOLATION',
];

export const getNotificationIcon = (type: NotificationType) =>
  ({
    SYSTEM: '!',
    PARKING: 'P',
    BOOKING: 'B',
    WALLET: 'W',
    PAYMENT: '$',
    ACCOUNT: 'A',
    PROMOTION: '%',
    CAMERA: 'C',
    VIOLATION: 'V',
  })[type];

export const getNotificationColor = (priority: NotificationPriority) =>
  ({
    INFO: colors.primary[500],
    SUCCESS: colors.success.main,
    WARNING: colors.warning.main,
    ERROR: colors.error.main,
    SYSTEM: colors.secondary[500],
  })[priority];

export const formatNotificationTimestamp = (createdAt: string, now = new Date()) => {
  const date = new Date(createdAt);
  const diff = now.getTime() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  }
  return format(date, 'HH:mm dd/MM/yyyy', { locale: vi });
};

export const getNotificationId = (item: UserNotification) => item.id || item._id || item.notificationId || '';

export const matchesNotificationFilter = (item: UserNotification, filter: NotificationFilter) => {
  if (filter === 'ALL') return true;
  if (filter === 'UNREAD') return !item.isRead;
  if (filter === 'READ') return item.isRead;
  return item.type === filter;
};

export const getNotificationNavigationTarget = (item: UserNotification) => {
  const metadata = item.metadata || {};
  if (typeof metadata.deepLink === 'string') return { deepLink: metadata.deepLink };
  if (item.type === 'BOOKING' && typeof metadata.bookingId === 'string') {
    return { tab: 'BookingsTab', screen: 'BookingDetails', params: { bookingId: metadata.bookingId } };
  }
  if (item.type === 'WALLET' || item.type === 'PAYMENT') return { tab: 'WalletTab', screen: 'Wallet' };
  if (item.type === 'ACCOUNT') return { tab: 'ProfileTab', screen: 'Profile' };
  return null;
};

