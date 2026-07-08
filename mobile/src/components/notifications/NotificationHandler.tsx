import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

import { useExpoPushToken } from '@/hooks/useExpoPushToken';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';
import { useSocket } from '@/hooks/useSocket';
import type { UserNotification } from '@/types/models';

import { InAppNotificationBanner } from './InAppNotificationBanner';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationHandler = () => {
  const socket = useSocket();
  const permissions = useNotificationPermissions();
  useExpoPushToken(permissions.status === 'granted');
  const [banner, setBanner] = useState<UserNotification | null>(null);

  useEffect(() => {
    if (permissions.status === 'undetermined' && !permissions.loading) {
      void permissions.requestPermission();
    }
  }, [permissions]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data || {};
      setBanner({
        id: String(data.id || Date.now()),
        title: event.request.content.title || 'Notification',
        content: event.request.content.body || '',
        type: (data.type as UserNotification['type']) || 'SYSTEM',
        priority: (data.priority as UserNotification['priority']) || 'INFO',
        isRead: false,
        metadata: data,
        createdAt: new Date().toISOString(),
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const handler = (payload: unknown) => setBanner(payload as UserNotification);
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  return <InAppNotificationBanner notification={banner} onDismiss={() => setBanner(null)} onPress={() => setBanner(null)} />;
};
