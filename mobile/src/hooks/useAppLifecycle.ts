import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';

export const useAppLifecycle = () => {
  const { isAuthenticated, refreshUser } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        void refreshUser();
        void socket.connect();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, refreshUser, socket]);
};
