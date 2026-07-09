import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/common';
import { useSocket } from '@/hooks/useSocket';
import { BookingBrowseScreen } from '@/screens/booking/BookingBrowseScreen';
import { BookingConfirmationScreen } from '@/screens/booking/BookingConfirmationScreen';
import { BookingDetailsScreen } from '@/screens/booking/BookingDetailsScreen';
import { MyBookingsScreen } from '@/screens/booking/MyBookingsScreen';
import { ParkingMapScreen } from '@/screens/booking/ParkingMapScreen';
import { QRScannerScreen } from '@/screens/booking/QRScannerScreen';
import { notificationsService } from '@/services/api/notifications';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { AddVehicleScreen } from '@/screens/profile/AddVehicleScreen';
import { ChangePasswordScreen } from '@/screens/profile/ChangePasswordScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { EditVehicleScreen } from '@/screens/profile/EditVehicleScreen';
import { PoliciesListScreen } from '@/screens/profile/PoliciesListScreen';
import { PolicyDetailScreen } from '@/screens/profile/PolicyDetailScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { VehicleListScreen } from '@/screens/profile/VehicleListScreen';
import { MembershipScreen } from '@/screens/wallet/MembershipScreen';
import { SubscriptionCheckoutScreen } from '@/screens/wallet/SubscriptionCheckoutScreen';
import { SubscriptionPackagesScreen } from '@/screens/wallet/SubscriptionPackagesScreen';
import { SubscriptionPaymentStatusScreen } from '@/screens/wallet/SubscriptionPaymentStatusScreen';
import { TopUpScreen } from '@/screens/wallet/TopUpScreen';
import { TransactionHistoryScreen } from '@/screens/wallet/TransactionHistoryScreen';
import { WalletScreen } from '@/screens/wallet/WalletScreen';
import { colors } from '@/theme';

import type {
  BookingStackParamList,
  HomeStackParamList,
  MainTabParamList,
  NotificationStackParamList,
  ProfileStackParamList,
  WalletStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BookingStack = createNativeStackNavigator<BookingStackParamList>();
const NotificationStack = createNativeStackNavigator<NotificationStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const iconMap: Record<keyof MainTabParamList, string> = {
  HomeTab: 'H',
  BookingsTab: 'B',
  NotificationsTab: 'N',
  WalletTab: 'W',
  ProfileTab: 'P',
};

const HomeNavigator = () => (
  <HomeStack.Navigator>
    <HomeStack.Screen component={HomeScreen} name="Home" options={{ headerShown: false }} />
  </HomeStack.Navigator>
);

const BookingNavigator = () => (
  <BookingStack.Navigator>
    <BookingStack.Screen
      component={BookingBrowseScreen}
      name="BookingBrowse"
      options={{ headerShown: false }}
    />
    <BookingStack.Screen component={MyBookingsScreen} name="MyBookings" options={{ headerShown: false }} />
    <BookingStack.Screen
      component={BookingConfirmationScreen}
      name="BookingConfirmation"
      options={{ title: 'Confirmation' }}
    />
    <BookingStack.Screen
      component={BookingDetailsScreen}
      name="BookingDetails"
      options={{ title: 'Booking Details' }}
    />
    <BookingStack.Screen component={QRScannerScreen} name="QRScanner" options={{ title: 'QR Scanner' }} />
    <BookingStack.Screen component={ParkingMapScreen} name="ParkingMap" options={{ title: 'Parking Map' }} />
  </BookingStack.Navigator>
);

const NotificationNavigator = () => (
  <NotificationStack.Navigator>
    <NotificationStack.Screen component={NotificationsScreen} name="Notifications" options={{ headerShown: false }} />
  </NotificationStack.Navigator>
);

const WalletNavigator = () => (
  <WalletStack.Navigator>
    <WalletStack.Screen component={WalletScreen} name="Wallet" options={{ headerShown: false }} />
    <WalletStack.Screen component={TopUpScreen} name="TopUp" options={{ title: 'Top Up' }} />
    <WalletStack.Screen
      component={TransactionHistoryScreen}
      name="TransactionHistory"
      options={{ title: 'Transactions' }}
    />
    <WalletStack.Screen component={MembershipScreen} name="Membership" options={{ title: 'VIP Membership' }} />
    <WalletStack.Screen
      component={SubscriptionPackagesScreen}
      name="SubscriptionPackages"
      options={{ title: 'VIP Packages' }}
    />
    <WalletStack.Screen
      component={SubscriptionCheckoutScreen}
      name="SubscriptionCheckout"
      options={{ title: 'Subscription Checkout' }}
    />
    <WalletStack.Screen
      component={SubscriptionPaymentStatusScreen}
      name="SubscriptionPaymentStatus"
      options={{ title: 'Payment Status' }}
    />
  </WalletStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen component={ProfileScreen} name="Profile" options={{ headerShown: false }} />
    <ProfileStack.Screen component={EditProfileScreen} name="EditProfile" options={{ title: 'Edit Profile' }} />
    <ProfileStack.Screen
      component={ChangePasswordScreen}
      name="ChangePassword"
      options={{ title: 'Change Password' }}
    />
    <ProfileStack.Screen component={VehicleListScreen} name="VehicleList" options={{ title: 'Vehicles' }} />
    <ProfileStack.Screen component={AddVehicleScreen} name="AddVehicle" options={{ title: 'Add Vehicle' }} />
    <ProfileStack.Screen component={EditVehicleScreen} name="EditVehicle" options={{ title: 'Edit Vehicle' }} />
    <ProfileStack.Screen component={PoliciesListScreen} name="Policies" options={{ title: 'Policies' }} />
    <ProfileStack.Screen component={PolicyDetailScreen} name="PolicyDetail" options={{ title: 'Policy Detail' }} />
  </ProfileStack.Navigator>
);

export const MainNavigator = () => {
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsService
      .getUnreadCount()
      .then((response) => setUnreadCount(response.data?.count || 0))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    const handler = () => setUnreadCount((count) => count + 1);
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarIcon: ({ color }) => (
          <AppText color={color} variant="body2">
            {iconMap[route.name]}
          </AppText>
        ),
      })}
    >
      <Tab.Screen component={HomeNavigator} name="HomeTab" options={{ title: 'Home' }} />
      <Tab.Screen component={BookingNavigator} name="BookingsTab" options={{ title: 'Bookings' }} />
      <Tab.Screen
        component={NotificationNavigator}
        name="NotificationsTab"
        options={{
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          title: 'Notifications',
        }}
      />
      <Tab.Screen component={WalletNavigator} name="WalletTab" options={{ title: 'Wallet' }} />
      <Tab.Screen component={ProfileNavigator} name="ProfileTab" options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
