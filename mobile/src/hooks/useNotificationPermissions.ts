import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export const useNotificationPermissions = () => {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);

  const checkPermissionStatus = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Notifications.getPermissionsAsync();
      setStatus(permission.status as PermissionStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      const permission = await Notifications.requestPermissionsAsync();
      setStatus(permission.status as PermissionStatus);
      return permission.status === 'granted';
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkPermissionStatus();
  }, [checkPermissionStatus]);

  return { status, loading, checkPermissionStatus, requestPermission };
};

