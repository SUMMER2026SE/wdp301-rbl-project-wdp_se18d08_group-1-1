import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { NotificationsScreen }  from '../screens/notifications/NotificationsScreen';
import type { NotificationStackParamList } from './types';

const Stack = createNativeStackNavigator<NotificationStackParamList>();

export const NotificationsStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#0D0D0D' },
    }}
  >
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);
