import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { authService } from '@/services/api/auth';

export const useExpoPushToken = (enabled: boolean) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = useCallback(async () => {
    if (!enabled || Constants.isDevice === false) return;
    setLoading(true);
    setError('');
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      setExpoPushToken(token.data);
      await authService.updatePushToken(token.data);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Push token registration failed.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void register();
  }, [register]);

  return { expoPushToken, loading, error, register };
};
