import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  Pressable,
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
import { subscriptionsService } from '@/services/api/subscriptions';
import { walletService } from '@/services/api/wallet';
import type { MembershipStatus } from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getMembershipVisualTier, MEMBERSHIP_TIER_COLORS } from '@/utils/membershipDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  screen?: string;
  params?: Record<string, unknown>;
};

// ─── Quick actions data ───────────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: 'car-outline',
    label: 'My vehicles',
    description: 'Manage license plates',
    screen: 'ProfileTab',
    params: { screen: 'VehicleList' },
  },
  {
    icon: 'wallet-outline',
    label: 'VALO Wallet',
    description: 'Top up and view balance',
    screen: 'WalletTab',
    params: { screen: 'Wallet' },
  },
  {
    icon: 'receipt-outline',
    label: 'History',
    description: 'Past parking sessions',
    screen: 'ProfileTab',
    params: { screen: 'ParkingHistory' },
  },
  {
    icon: 'ribbon-outline',
    label: 'Membership',
    description: 'Member benefits',
    screen: 'WalletTab',
    params: { screen: 'Membership' },
  },
];

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: { navigation?: any }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch {
      // silently fail — show data from auth context
    }
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const res = await walletService.getWallet();
      if (res?.data?.balance !== undefined) {
        setWalletBalance(res.data.balance);
      }
    } catch {
      // silently fail
    }
  }, []);

  const loadMembership = useCallback(async () => {
    try {
      const response = await subscriptionsService.getMembership();
      setMembership(response.data || null);
    } catch {
      // Keep the home screen usable when membership data is temporarily unavailable.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void loadWallet();
      void loadMembership();
    }, [loadMembership, loadProfile, loadWallet]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadWallet(), loadMembership()]);
    setRefreshing(false);
  };

  const displayName = profile?.fullName || user?.username || 'Customer';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUri = profile?.avatar || null;
  const avatarTheme = MEMBERSHIP_TIER_COLORS[getMembershipVisualTier(membership)];
  const activeMembership = membership?.status === 'active' && membership.isVip
    ? membership
    : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

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
        {/* ── Top Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Notification bell */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              accessibilityLabel="Open notifications"
              accessibilityRole="button"
              onPress={() => navigation?.navigate?.('NotificationsTab')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open account"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('ProfileTab', { screen: 'Profile' })}
              style={[
                styles.avatar,
                {
                  backgroundColor: avatarTheme.avatarBackground,
                  borderColor: avatarTheme.accent,
                  overflow: 'hidden',
                },
              ]}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={[styles.avatarText, { color: avatarTheme.avatarText }]}>{initial}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero Banner ─────────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['#211D12', '#17150F', COLORS.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Gold accent line */}
          <LinearGradient
            colors={[COLORS.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerAccentLine}
          />

          <View style={styles.bannerContent}>
            <View style={styles.bannerMetaRow}>
              <View style={styles.bannerBadge}>
                <Ionicons name="navigate-outline" size={13} color={COLORS.gold} />
                <Text style={styles.bannerBadgeText}>Parking made effortless</Text>
              </View>
              <View style={styles.openBadge}>
                <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.openBadgeText}>Open 24/7</Text>
              </View>
            </View>

            <Text style={styles.bannerTitle}>Your parking space, ready when you are.</Text>
            <Text style={styles.bannerSub}>Choose a spot, book ahead, and enter without circling for parking.</Text>

            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation?.navigate?.('Bookings', { screen: 'FindParking' })}
                style={({ pressed }) => [styles.primaryAction, pressed && styles.actionPressed]}
              >
                <Ionicons name="navigate" size={16} color={COLORS.textInverse} />
                <Text numberOfLines={1} style={styles.primaryActionText}>Find a space</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation?.navigate?.('Bookings', { screen: 'CreateBooking' })}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.gold} />
                <Text numberOfLines={1} style={styles.secondaryActionText}>Book ahead</Text>
              </Pressable>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>
                {walletBalance !== null ? formatCurrency(walletBalance) : 'Not loaded'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ───────────────────────────────────── */}
        {activeMembership ? (
          <TouchableOpacity
            accessibilityLabel="View membership details and assigned VIP spaces"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => navigation?.navigate?.('WalletTab', { screen: 'Membership' })}
            style={styles.membershipCard}
          >
            <LinearGradient
              colors={['rgba(226,186,75,0.18)', 'rgba(226,186,75,0.05)', 'rgba(11,12,14,0.96)']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.membershipTopRow}>
              <View style={styles.membershipIdentity}>
                <View style={styles.membershipIcon}>
                  <Ionicons name="ribbon" size={20} color={COLORS.gold} />
                </View>
                <View style={styles.membershipTitleWrap}>
                  <Text style={styles.membershipEyebrow}>
                    {activeMembership.package?.type === 'yearly' ? 'Annual member' : 'Monthly member'}
                  </Text>
                  <Text numberOfLines={1} style={styles.membershipName}>
                    {activeMembership.package?.name ?? 'VALO Membership'}
                  </Text>
                </View>
              </View>
              <View style={styles.membershipActivePill}>
                <View style={styles.membershipActiveDot} />
                <Text style={styles.membershipActiveText}>Active</Text>
              </View>
            </View>

            <View style={styles.membershipDivider} />

            <View style={styles.vipSlotHeader}>
              <Text style={styles.vipSlotLabel}>Assigned VIP spaces</Text>
              {activeMembership.expireAt ? (
                <Text style={styles.membershipExpiry}>Expires {formatDate(activeMembership.expireAt)}</Text>
              ) : null}
            </View>
            {activeMembership.reservedSlots.length > 0 ? (
              <View style={styles.vipSlotList}>
                {activeMembership.reservedSlots.map((slot) => (
                  <View key={`${slot.floorId}-${slot.slotCode}`} style={styles.vipSlotPill}>
                    <Ionicons name="location" size={15} color={COLORS.gold} />
                    <Text style={styles.vipSlotCode}>{slot.slotCode}</Text>
                    <Text numberOfLines={1} style={styles.vipSlotFloor}>
                      {' - '}{slot.floorName || `Floor ${slot.floorNumber ?? '--'}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.vipSlotPending}>
                <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                <Text style={styles.vipSlotPendingText}>Your plan is active. VIP space assignment is pending.</Text>
              </View>
            )}

            <View style={styles.membershipFooter}>
              <Text style={styles.membershipFooterText}>View membership benefits</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gold} />
            </View>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              accessibilityLabel={`${action.label}. ${action.description}`}
              accessibilityRole="button"
              key={action.label}
              style={({ pressed }) => [styles.quickItem, pressed && styles.quickItemPressed]}
              onPress={() => navigation?.navigate?.(action.screen ?? 'Home', action.params)}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name={action.icon} size={23} color={COLORS.gold} />
              </View>
              <View style={styles.quickCopy}>
                <Text style={styles.quickLabel}>{action.label}</Text>
                <Text style={styles.quickDescription}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* ── Info Banner ─────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.gold} />
          <Text style={styles.infoBannerText}>
            VALO Parking is open 24/7. Book ahead to secure your space.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  userName: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.goldDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarText: { color: COLORS.textInverse, fontWeight: '700', fontSize: FONT_SIZES.md },

  // Hero banner
  heroBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226,186,75,0.2)',
    minHeight: 276,
  },
  bannerAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  bannerContent: {
    padding: SPACING.lg,
  },
  bannerMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(226,186,75,0.15)',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  bannerBadgeText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '700' },
  openBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  openBadgeText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  bannerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.7,
    lineHeight: 35,
    marginTop: SPACING.lg,
    maxWidth: 310,
  },
  bannerSub: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginTop: SPACING.sm,
    maxWidth: 310,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.lg,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 10,
  },
  primaryActionText: {
    color: COLORS.textInverse,
    flexShrink: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(226,186,75,0.06)',
    borderColor: 'rgba(226,186,75,0.32)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    width: 96,
  },
  secondaryActionText: { color: COLORS.gold, flexShrink: 1, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  actionPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  balanceRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(226,186,75,0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  balanceValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '800' },

  // Active membership identity
  membershipCard: {
    borderColor: 'rgba(226,186,75,0.34)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  membershipTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  membershipIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    minWidth: 0,
  },
  membershipIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(226,186,75,0.14)',
    borderColor: 'rgba(226,186,75,0.28)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  membershipTitleWrap: { flex: 1, minWidth: 0 },
  membershipEyebrow: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  membershipName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    marginTop: 2,
  },
  membershipActivePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(126,232,162,0.1)',
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  membershipActiveDot: {
    backgroundColor: COLORS.success,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  membershipActiveText: { color: COLORS.success, fontSize: 10, fontWeight: '700' },
  membershipDivider: {
    backgroundColor: 'rgba(226,186,75,0.15)',
    height: 1,
    marginVertical: SPACING.md,
  },
  vipSlotHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  vipSlotLabel: { color: COLORS.gold, fontSize: FONT_SIZES.xs, fontWeight: '700' },
  membershipExpiry: { color: COLORS.textMuted, fontSize: 10 },
  vipSlotList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  vipSlotPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.34)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: '100%',
    minHeight: 38,
    paddingHorizontal: SPACING.sm,
  },
  vipSlotCode: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '900', marginLeft: 5 },
  vipSlotFloor: { color: COLORS.textSecondary, flexShrink: 1, fontSize: FONT_SIZES.xs, marginLeft: 3 },
  vipSlotPending: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,159,67,0.08)',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  vipSlotPendingText: { color: COLORS.warning, flex: 1, fontSize: FONT_SIZES.xs, lineHeight: 17 },
  membershipFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
  },
  membershipFooterText: { color: COLORS.gold, fontSize: FONT_SIZES.xs, fontWeight: '700' },

  // Quick actions
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  quickGrid: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  quickItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 72,
    padding: SPACING.md,
  },
  quickItemPressed: { backgroundColor: COLORS.surfaceElevated, transform: [{ scale: 0.99 }] },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(226,186,75,0.1)',
    borderColor: 'rgba(226,186,75,0.18)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCopy: { flex: 1 },
  quickLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  quickDescription: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 3 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(226,186,75,0.07)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(226,186,75,0.2)',
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
