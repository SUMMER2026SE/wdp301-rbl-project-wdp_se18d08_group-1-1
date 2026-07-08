import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import HomeScreen from '../screens/customer/HomeScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';

// ─── Placeholder screen for Phase 2/3 screens ─────────────────────────────────
import ComingSoonScreen from '../screens/shared/ComingSoonScreen';

// ─── Tab param list ───────────────────────────────────────────────────────────
export type CustomerTabParamList = {
  Home: undefined;
  BookingList: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

// ─── Tab icon helper ──────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, activeIcon: IoniconName, inactiveIcon: IoniconName, color: string) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Ionicons name={focused ? activeIcon : inactiveIcon} size={22} color={color} />
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
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
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'home', 'home-outline', color),
        }}
      />
      <Tab.Screen
        name="BookingList"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Đặt chỗ',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'calendar', 'calendar-outline', color),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Ví tiền',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'wallet', 'wallet-outline', color),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarBadge: undefined,
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'notifications', 'notifications-outline', color),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'person', 'person-outline', color),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Tab bar styles ───────────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.12)',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
});
