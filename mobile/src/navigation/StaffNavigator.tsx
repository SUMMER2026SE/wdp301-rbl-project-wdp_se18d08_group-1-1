import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';
import ComingSoonScreen from '../screens/shared/ComingSoonScreen';
import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';

// ─── Tab param list ───────────────────────────────────────────────────────────
export type StaffTabParamList = {
  Dashboard: undefined;
  LiveGrid: undefined;
  Sessions: undefined;
  StaffProfile: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();

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
export default function StaffNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: '#60B4FF',
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: tabStyles.label,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={StaffDashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'grid', 'grid-outline', color),
        }}
      />
      <Tab.Screen
        name="LiveGrid"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Lưới xe',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'map', 'map-outline', color),
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Phiên xe',
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, 'car-sport', 'car-sport-outline', color),
        }}
      />
      <Tab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
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
    backgroundColor: '#0F1A2A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(96,180,255,0.12)',
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
    backgroundColor: 'rgba(96,180,255,0.12)',
  },
});
