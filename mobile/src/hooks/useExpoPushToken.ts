import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';

import { authService } from '@/services/api/auth';
import { isExpoGo } from '@/utils/notificationRuntime';

// Expo Go does not support remote push notifications from SDK 53+.
// Push tokens are only available in development builds and production builds.
const isExpoGo = Constants.appOwnership === 'expo';

export const useExpoPushToken = (enabled: boolean) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = useCallback(async () => {
    if (!enabled || isExpoGo || Constants.isDevice === false) return;
    setLoading(true);
    setError('');
    try {
      const Notifications = await import('expo-notifications');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      setExpoPushToken(token.data);
      await authService.updatePushToken(token.data);
    } catch (registerError) {
      setError(
        registerError instanceof Error ? registerError.message : 'Push token registration failed.'
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void register();
  }, [register]);

  return { expoPushToken, loading, error, register };
};
