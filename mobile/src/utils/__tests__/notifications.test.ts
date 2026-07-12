import type { UserNotification } from '@/types/models';
import { formatNotificationTimestamp, matchesNotificationFilter } from '@/utils/notifications';

const baseNotification: UserNotification = {
  id: '1',
  title: 'Title',
  content: 'Content',
  type: 'BOOKING',
  priority: 'INFO',
  isRead: false,
  createdAt: '2026-07-08T03:00:00.000Z',
};

describe('notifications utilities', () => {
  it('filters unread, read, and type filters correctly', () => {
    expect(matchesNotificationFilter(baseNotification, 'ALL')).toBe(true);
    expect(matchesNotificationFilter(baseNotification, 'UNREAD')).toBe(true);
    expect(matchesNotificationFilter(baseNotification, 'READ')).toBe(false);
    expect(matchesNotificationFilter(baseNotification, 'BOOKING')).toBe(true);
    expect(matchesNotificationFilter(baseNotification, 'WALLET')).toBe(false);
  });

  it('uses absolute timestamp for old notifications', () => {
    expect(formatNotificationTimestamp(baseNotification.createdAt, new Date('2026-07-10T03:00:00.000Z'))).toContain('08/07/2026');
  });
});

