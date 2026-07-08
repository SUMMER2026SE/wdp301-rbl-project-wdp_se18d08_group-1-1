import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import StaffNavigator from './StaffNavigator';

// ─── Inner router — reads auth context ───────────────────────────────────────
function RootRouter() {
  const { user } = useAuth();

  if (!user) {
    return <AuthNavigator />;
  }

  if (user.role === 'staff' || user.role === 'admin') {
    return <StaffNavigator />;
  }

  // customer (default)
  return <CustomerNavigator />;
}

// ─── Root navigator wrapped with AuthProvider ─────────────────────────────────
export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootRouter />
      </NavigationContainer>
    </AuthProvider>
  );
}
