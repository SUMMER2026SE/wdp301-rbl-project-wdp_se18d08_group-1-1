import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';
import { BookingStackNavigator, type BookingStackParamList } from './BookingStackNavigator';
import { NotificationsStackNavigator } from './NotificationsStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { WalletStackNavigator } from './WalletStackNavigator';
import type { NotificationStackParamList, ProfileStackParamList, WalletStackParamList } from './types';
import HomeScreen from '../screens/customer/HomeScreen';

export type CustomerTabParamList = {
  Home: undefined;
  Bookings: NavigatorScreenParams<BookingStackParamList> | undefined;
  WalletTab: NavigatorScreenParams<WalletStackParamList> | undefined;
  NotificationsTab: NavigatorScreenParams<NotificationStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, activeIcon: IoniconName, inactiveIcon: IoniconName, color: string) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Ionicons name={focused ? activeIcon : inactiveIcon} size={22} color={color} />
    </View>
  );
}

export default function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: tabStyles.label,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'home', 'home-outline', color),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingStackNavigator}
        options={{
          tabBarLabel: 'Đặt chỗ',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'calendar', 'calendar-outline', color),
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStackNavigator}
        options={{
          tabBarLabel: 'Ví tiền',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'wallet', 'wallet-outline', color),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarBadge: undefined,
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'notifications', 'notifications-outline', color),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'person', 'person-outline', color),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#111111',
    borderTopColor: 'rgba(212,175,55,0.12)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
});
