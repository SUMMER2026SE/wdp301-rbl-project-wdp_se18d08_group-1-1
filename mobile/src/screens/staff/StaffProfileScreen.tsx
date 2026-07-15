import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProfile, type Profile } from '../../api/profile.api';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { MenuItem } from '@/components/profile/MenuItem';
import { useAppAlert } from '@/contexts/AppAlertContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StaffProfileStackParamList, StaffTabParamList } from '@/navigation/StaffNavigator';

// ─── Screen ───────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<StaffProfileStackParamList, 'StaffProfileHome'>;

export default function StaffProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { alert } = useAppAlert();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch {
      // use auth context data
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const displayName = profile?.fullName || user?.username || 'Staff member';
  const email = profile?.email || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const goToTab = (screen: keyof StaffTabParamList) => navigation.getParent()?.navigate(screen);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {/* ── Profile Card ────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['rgba(212,175,55,0.12)', 'rgba(212,175,55,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[COLORS.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardTopLine}
          />

          {loading ? (
            <ActivityIndicator color={COLORS.gold} style={{ padding: SPACING.xl }} />
          ) : (
            <View style={styles.profileCardContent}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarRing}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.staffBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={COLORS.textInverse} />
                </View>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
                <View style={styles.rolePill}>
                  <Ionicons name="briefcase-outline" size={11} color={COLORS.gold} />
                  <Text style={[styles.rolePillText, { color: COLORS.gold }]}>Operations staff</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Work section ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Work tools</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="grid-outline"
            label="Live parking grid"
            sublabel="View real-time space status"
            iconColor={COLORS.gold}
            iconBg="rgba(212,175,55,0.12)"
            onPress={() => goToTab('LiveGrid')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="car-sport-outline"
            label="Parking sessions"
            sublabel="Manage check-in and check-out"
            iconColor={COLORS.gold}
            iconBg="rgba(212,175,55,0.12)"
            onPress={() => goToTab('Sessions')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="people-outline"
            label="Customer lookup"
            sublabel="Find customer information"
            iconColor={COLORS.gold}
            iconBg="rgba(212,175,55,0.12)"
            onPress={() => goToTab('Manage')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="notifications-outline"
            label="System notifications"
            sublabel="Send and manage notifications"
            iconColor={COLORS.gold}
            iconBg="rgba(212,175,55,0.12)"
            onPress={() => goToTab('Manage')}
          />
        </View>

        {/* ── Account section ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Edit profile"
            iconColor={COLORS.gold}
            iconBg="rgba(212,175,55,0.12)"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="lock-closed-outline"
            label="Change password"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceElevated}
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        {/* ── Logout ──────────────────────────────────────────── */}
        <View style={[styles.menuCard, { marginBottom: SPACING.xl }]}>
          <MenuItem
            icon="log-out-outline"
            label="Sign out"
            iconColor={COLORS.error}
            iconBg="rgba(255,77,77,0.12)"
            onPress={handleLogout}
            showArrow={false}
            danger
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xl },

  pageHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  pageTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.textPrimary },

  profileCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  avatarWrap: { position: 'relative' },
  avatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.goldDark,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.gold },
  staffBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  profileEmail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
  },
  rolePillText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  menuCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 + SPACING.md },
});
