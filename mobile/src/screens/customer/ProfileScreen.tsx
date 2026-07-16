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
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProfile, type Profile } from '../../api/profile.api';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { MenuItem } from '@/components/profile/MenuItem';
import { useAppAlert } from '@/contexts/AppAlertContext';
import { subscriptionsService } from '@/services/api/subscriptions';
import type { MembershipStatus } from '@/types/subscription.types';
import {
  getMembershipTierLabel,
  getMembershipVisualTier,
  MEMBERSHIP_TIER_COLORS,
  type MembershipVisualTier,
} from '@/utils/membershipDisplay';

const MEMBERSHIP_THEMES: Record<MembershipVisualTier, {
  accent: string;
  avatarBackground: string;
  avatarText: string;
  border: string;
  gradient: [string, string];
  pillBackground: string;
}> = {
  standard: {
    ...MEMBERSHIP_TIER_COLORS.standard,
    border: 'rgba(148,163,184,0.28)',
    gradient: ['rgba(148,163,184,0.09)', 'rgba(148,163,184,0.02)'],
    pillBackground: 'rgba(148,163,184,0.12)',
  },
  monthly: {
    ...MEMBERSHIP_TIER_COLORS.monthly,
    border: 'rgba(212,175,55,0.38)',
    gradient: ['rgba(212,175,55,0.14)', 'rgba(212,175,55,0.03)'],
    pillBackground: 'rgba(212,175,55,0.12)',
  },
  yearly: {
    ...MEMBERSHIP_TIER_COLORS.yearly,
    border: 'rgba(168,85,247,0.46)',
    gradient: ['rgba(168,85,247,0.18)', 'rgba(76,29,149,0.04)'],
    pillBackground: 'rgba(168,85,247,0.14)',
  },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: { navigation?: any }) {
  const { user, logout } = useAuth();
  const { alert } = useAppAlert();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileResult, membershipResult] = await Promise.allSettled([
        fetchProfile(),
        subscriptionsService.getMembership(),
      ]);
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (membershipResult.status === 'fulfilled') {
        setMembership(membershipResult.value.data || null);
      }
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

  const displayName = profile?.fullName || user?.username || 'User';
  const email = profile?.email || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const roleBadge = user?.role === 'customer' ? 'Customer' : user?.role ?? '';
  const membershipTier = getMembershipVisualTier(membership);
  const membershipTheme = MEMBERSHIP_THEMES[membershipTier];
  const accountBadge = user?.role === 'customer'
    ? getMembershipTierLabel(membershipTier)
    : roleBadge;

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
          <Text style={styles.pageTitle}>Account</Text>
        </View>

        {/* ── Profile Card ────────────────────────────────────── */}
        <View style={[styles.profileCard, { borderColor: membershipTheme.border }]}>
          <LinearGradient
            colors={membershipTheme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[membershipTheme.accent, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardTopLine}
          />

          {loading ? (
            <ActivityIndicator color={COLORS.gold} style={{ padding: SPACING.xl }} />
          ) : (
            <TouchableOpacity 
              style={styles.profileCardContent}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('EditProfile')}
            >
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <View
                  style={[
                    styles.avatarRing,
                    {
                      backgroundColor: membershipTheme.avatarBackground,
                      borderColor: membershipTheme.accent,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={{ width: '100%', height: '100%' }} />
                  ) : user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={[styles.avatarText, { color: membershipTheme.avatarText }]}>{initial}</Text>
                  )}
                </View>
                {/* Edit badge */}
                <View style={[styles.editBadge, { backgroundColor: membershipTheme.accent }]}>
                  <Ionicons name="camera-outline" size={12} color={COLORS.textInverse} />
                </View>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
                <View style={[styles.rolePill, { backgroundColor: membershipTheme.pillBackground }]}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={membershipTheme.accent} />
                  <Text style={[styles.rolePillText, { color: membershipTheme.accent }]}>{accountBadge}</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={membershipTheme.accent} style={{ opacity: 0.65 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Account section ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>My account</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Personal profile"
            sublabel="Personal information"
            iconColor="#4ECDC4"
            iconBg="rgba(78,205,196,0.12)"
            onPress={() => navigation?.navigate?.('EditProfile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="car-outline"
            label="My vehicles"
            sublabel="Manage vehicles"
            iconColor="#7EE8A2"
            iconBg="rgba(126,232,162,0.12)"
            onPress={() => navigation?.navigate?.('VehicleList')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="calendar-outline"
            label="My bookings"
            sublabel="Manage upcoming reservations"
            iconColor="#4ECDC4"
            iconBg="rgba(78,205,196,0.12)"
            onPress={() => navigation?.navigate?.('BookingList')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="ribbon-outline"
            label="Membership plans"
            sublabel="VIP access and benefits"
            iconColor="#FFD700"
            iconBg="rgba(255,215,0,0.12)"
            onPress={() => navigation?.navigate?.('WalletTab', { screen: 'Membership' })}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="receipt-outline"
            label="Parking history"
            sublabel="View sessions and receipts"
            iconColor="#E07BE0"
            iconBg="rgba(224,123,224,0.12)"
            onPress={() => navigation?.navigate?.('ParkingHistory')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="wallet-outline"
            label="VALO Wallet"
            sublabel={
              profile?.wallet?.balance !== undefined
                ? `Balance: ${profile.wallet.balance.toLocaleString('en-US')} VND`
                : 'Manage your balance'
            }
            iconColor="#FF9F43"
            iconBg="rgba(255,159,67,0.12)"
            onPress={() => navigation?.navigate?.('WalletTab')}
          />
        </View>

        {/* ── Settings section ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            iconColor="#60B4FF"
            iconBg="rgba(96,180,255,0.12)"
            onPress={() => navigation?.navigate?.('NotificationsTab')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="lock-closed-outline"
            label="Change password"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceElevated}
            onPress={() => navigation?.navigate?.('ChangePassword')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="sparkles-outline"
            label="Services"
            sublabel="Pricing and turnaround times"
            iconColor="#7EE8A2"
            iconBg="rgba(126,232,162,0.12)"
            onPress={() => navigation?.navigate?.('Services')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            label="Policies and terms"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceElevated}
            onPress={() => navigation?.navigate?.('Policies')}
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

        {/* Version */}
        <Text style={styles.versionText}>VALO Parking v1.0.0</Text>
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

  // Profile card
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
  avatarText: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textInverse },
  editBadge: {
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
  rolePillText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '600' },

  // Menu
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

  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
  },
});
