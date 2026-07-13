import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
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
import { subscriptionsService } from '@/services/api/subscriptions';
import { walletService } from '@/services/api/wallet';
import type { MembershipStatus } from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getMembershipVisualTier, MEMBERSHIP_TIER_COLORS } from '@/utils/membershipDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  screen?: string;
  params?: Record<string, unknown>;
};

// ─── Quick actions data ───────────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: 'navigate-circle-outline',
    label: 'Tìm bãi xe',
    color: '#D4AF37',
    bg: 'rgba(212,175,55,0.12)',
    screen: 'Bookings',
    params: { screen: 'FindParking' },
  },
  {
    icon: 'calendar-outline',
    label: 'Đặt chỗ',
    color: '#60B4FF',
    bg: 'rgba(96,180,255,0.12)',
    screen: 'Bookings',
    params: { screen: 'CreateBooking' },
  },
  {
    icon: 'car-outline',
    label: 'Xe của tôi',
    color: '#7EE8A2',
    bg: 'rgba(126,232,162,0.12)',
    screen: 'ProfileTab',
    params: { screen: 'VehicleList' },
  },
  { icon: 'wallet-outline', label: 'Ví tiền', color: '#FF9F43', bg: 'rgba(255,159,67,0.12)', screen: 'WalletTab', params: { screen: 'Wallet' } },
  {
    icon: 'receipt-outline',
    label: 'Lịch sử',
    color: '#E07BE0',
    bg: 'rgba(224,123,224,0.12)',
    screen: 'ProfileTab',
    params: { screen: 'ParkingHistory' },
  },
  {
    icon: 'ribbon-outline',
    label: 'Membership',
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.12)',
    screen: 'WalletTab',
    params: { screen: 'Membership' },
  },
];

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
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

  const displayName = profile?.fullName || user?.username || 'Khách hàng';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUri = profile?.avatar || null;
  const avatarTheme = MEMBERSHIP_TIER_COLORS[getMembershipVisualTier(membership)];
  const activeMembership = membership?.status === 'active' && membership.isVip
    ? membership
    : null;

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
        {/* ── Top Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>{displayName} 👋</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Notification bell */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation?.navigate?.('NotificationsTab')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
              {/* Badge dot */}
              <View style={styles.notifDot} />
            </TouchableOpacity>

                      {/* Avatar */}
            <View
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
            </View>
          </View>
        </View>

        {/* ── Hero Banner ─────────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['#1C1A0F', '#1A1505', '#0D0D0D']}
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
            <View style={styles.bannerLeft}>
              <View style={styles.bannerBadge}>
                <Ionicons name="flash" size={10} color={COLORS.gold} />
                <Text style={styles.bannerBadgeText}>Smart Parking</Text>
              </View>
              <Text style={styles.bannerTitle}>VALO{'\n'}PARKING</Text>
              <Text style={styles.bannerSub}>Đặt chỗ thông minh,{'\n'}không chờ đợi</Text>
            </View>

            <View style={styles.bannerRight}>
              <View style={styles.bannerGlowCircle}>
                <Ionicons name="car" size={40} color={COLORS.gold} />
              </View>
            </View>
          </View>
        </View>

                {/* ── Stats Row ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="time-outline"
            label="Đặt chỗ đang có"
            value="0"
            color={COLORS.gold}
          />
          <StatCard
            icon="wallet-outline"
            label="Số dư ví"
            value={
              walletBalance !== null
                ? formatCurrency(walletBalance)
                : '--'
            }
            color="#60B4FF"
          />
        </View>

        {/* ── Quick Actions ───────────────────────────────────── */}
        {activeMembership ? (
          <TouchableOpacity
            accessibilityLabel="Xem chi tiết gói Membership và ô VIP được cấp"
            activeOpacity={0.82}
            onPress={() => navigation?.navigate?.('WalletTab', { screen: 'Membership' })}
            style={styles.membershipCard}
          >
            <LinearGradient
              colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.05)', 'rgba(13,13,13,0.96)']}
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
                    {activeMembership.package?.type === 'yearly' ? 'THÀNH VIÊN NĂM' : 'THÀNH VIÊN THÁNG'}
                  </Text>
                  <Text numberOfLines={1} style={styles.membershipName}>
                    {activeMembership.package?.name ?? 'VALO Membership'}
                  </Text>
                </View>
              </View>
              <View style={styles.membershipActivePill}>
                <View style={styles.membershipActiveDot} />
                <Text style={styles.membershipActiveText}>Đang hoạt động</Text>
              </View>
            </View>

            <View style={styles.membershipDivider} />

            <View style={styles.vipSlotHeader}>
              <Text style={styles.vipSlotLabel}>Ô VIP ĐƯỢC CẤP</Text>
              {activeMembership.expireAt ? (
                <Text style={styles.membershipExpiry}>Hết hạn {formatDate(activeMembership.expireAt)}</Text>
              ) : null}
            </View>
            {activeMembership.reservedSlots.length > 0 ? (
              <View style={styles.vipSlotList}>
                {activeMembership.reservedSlots.map((slot) => (
                  <View key={`${slot.floorId}-${slot.slotCode}`} style={styles.vipSlotPill}>
                    <Ionicons name="location" size={15} color={COLORS.gold} />
                    <Text style={styles.vipSlotCode}>{slot.slotCode}</Text>
                    <Text numberOfLines={1} style={styles.vipSlotFloor}>
                      · {slot.floorName || `Tầng ${slot.floorNumber ?? '--'}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.vipSlotPending}>
                <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                <Text style={styles.vipSlotPendingText}>Gói đang hoạt động, ô VIP đang chờ được cấp.</Text>
              </View>
            )}

            <View style={styles.membershipFooter}>
              <Text style={styles.membershipFooterText}>Xem quyền lợi Membership</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gold} />
            </View>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickItem}
              onPress={() => navigation?.navigate?.(action.screen ?? 'Home', action.params)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Info Banner ─────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.gold} />
          <Text style={styles.infoBannerText}>
            Bãi xe VALO mở cửa 24/7. Đặt chỗ trước để đảm bảo vị trí của bạn.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}22` }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderColor: 'rgba(212,175,55,0.2)',
    minHeight: 140,
  },
  bannerAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  bannerLeft: { flex: 1 },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bannerBadgeText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '600' },
  bannerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    lineHeight: 30,
  },
  bannerSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 18 },
  bannerRight: { paddingLeft: SPACING.md },
  bannerGlowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Active membership identity
  membershipCard: {
    borderColor: 'rgba(212,175,55,0.34)',
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
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.28)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  membershipTitleWrap: { flex: 1, minWidth: 0 },
  membershipEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
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
    backgroundColor: 'rgba(212,175,55,0.15)',
    height: 1,
    marginVertical: SPACING.md,
  },
  vipSlotHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  vipSlotLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  quickItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
