import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LinkingOptions,
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/common';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useAuth } from '@/hooks/useAuth';
import { NAVIGATION_STATE_KEY } from '@/utils/constants';

import { AuthNavigator } from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import StaffNavigator from './StaffNavigator';

const linking: LinkingOptions<Record<string, unknown>> = {
  prefixes: ['valo://'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      Home: 'home',
      Bookings: 'bookings',
      WalletTab: 'wallet',
      NotificationsTab: 'notifications',
      ProfileTab: 'profile',
    },
  },
};

const AppLifecycleBridge = () => {
  useAppLifecycle();
  return null;
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [initialState, setInitialState] = useState<PartialState<NavigationState>>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        if (savedState) {
          setInitialState(JSON.parse(savedState) as PartialState<NavigationState>);
        }
      } finally {
        setIsReady(true);
      }
    };

    void restoreState();
  }, []);

  if (isLoading || !isReady) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      linking={linking}
      onStateChange={(state) => {
        if (state) {
          void AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
        }
      }}
    >
      <AppLifecycleBridge />
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === 'staff' || user?.role === 'admin' ? (
        <StaffNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};
