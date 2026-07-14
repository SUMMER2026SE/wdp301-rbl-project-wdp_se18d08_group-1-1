import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';
import LiveGridScreen from '../screens/staff/LiveGridScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';
import { SessionDetailScreen } from '../screens/staff/SessionDetailScreen';
import { SessionListScreen } from '../screens/staff/SessionListScreen';
import type { StaffSessionStackParamList } from '../screens/staff/SessionListScreen';

const SessionStack = createNativeStackNavigator<StaffSessionStackParamList>();

function SessionStackNavigator() {
  return (
    <SessionStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <SessionStack.Screen name="SessionList" component={SessionListScreen} />
      <SessionStack.Screen name="SessionDetail" component={SessionDetailScreen} />
    </SessionStack.Navigator>
  );
}

export type StaffTabParamList = {
  Dashboard: undefined;
  LiveGrid: undefined;
  Sessions: undefined;
  StaffProfile: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, activeIcon: IoniconName, inactiveIcon: IoniconName, color: string) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Ionicons name={focused ? activeIcon : inactiveIcon} size={22} color={color} />
    </View>
  );
}

export default function StaffNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: COLORS.staffBlue,
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
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'grid', 'grid-outline', color),
        }}
      />
      <Tab.Screen
        name="LiveGrid"
        component={LiveGridScreen}
        options={{
          tabBarLabel: 'Lưới xe',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'map', 'map-outline', color),
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionStackNavigator}
        options={{
          tabBarLabel: 'Phiên xe',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'car-sport', 'car-sport-outline', color),
        }}
      />
      <Tab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ focused, color }) => tabIcon(focused, 'person', 'person-outline', color),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#0F1A2A',
    borderTopColor: 'rgba(96,180,255,0.12)',
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
    backgroundColor: 'rgba(96,180,255,0.12)',
  },
});
