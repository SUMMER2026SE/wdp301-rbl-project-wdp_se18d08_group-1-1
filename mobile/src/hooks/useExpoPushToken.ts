import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { authService } from '@/services/api/auth';

// Expo Go does not support remote push notifications from SDK 53+.
// Push tokens are only available in development builds and production builds.
const isExpoGo = Constants.appOwnership === 'expo';

export const useExpoPushToken = (enabled: boolean) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = useCallback(async () => {
    if (!enabled) return;

    // Skip push token registration on Expo Go — not supported in SDK 53+.
    // Real-time notifications still work via Socket.IO while the app is open.
    if (isExpoGo) {
      if (__DEV__) {
        console.info(
          '[PushToken] Skipped: running in Expo Go. Use a development build for push notifications.'
        );
      }
      return;
    }

    setLoading(true);
    setError('');
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
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
