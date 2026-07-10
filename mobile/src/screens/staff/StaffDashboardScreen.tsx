import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type StatItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
};

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  screen: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function todayString() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: 'grid-outline',
    label: 'Lưới bãi xe',
    sublabel: 'Giám sát real-time',
    color: COLORS.gold,
    bg: 'rgba(212,175,55,0.12)',
    screen: 'LiveGrid',
  },
  {
    icon: 'car-outline',
    label: 'Phiên đỗ xe',
    sublabel: 'Check-in / Check-out',
    color: '#60B4FF',
    bg: 'rgba(96,180,255,0.12)',
    screen: 'Sessions',
  },
  {
    icon: 'search-outline',
    label: 'Tra cứu KH',
    sublabel: 'Tìm thông tin khách',
    color: '#7EE8A2',
    bg: 'rgba(126,232,162,0.12)',
    screen: 'CustomerLookup',
  },
  {
    icon: 'notifications-outline',
    label: 'Thông báo',
    sublabel: 'Gửi & quản lý',
    color: '#E07BE0',
    bg: 'rgba(224,123,224,0.12)',
    screen: 'StaffNotifications',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StaffDashboardScreen({ navigation }: { navigation?: any }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Mock stats – replace with real API calls in Phase 2
  const [stats] = useState<StatItem[]>([
    { icon: 'checkmark-circle-outline', label: 'Slot trống', value: '--', color: '#7EE8A2' },
    { icon: 'car-sport-outline', label: 'Xe đang đỗ', value: '--', color: COLORS.gold },
    { icon: 'time-outline', label: 'Phiên hôm nay', value: '--', color: '#60B4FF' },
    { icon: 'alert-circle-outline', label: 'Cảnh báo', value: '--', color: COLORS.error },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO Phase 2: fetch real stats
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const displayName = user?.username ?? 'Nhân viên';
  const initial = displayName.charAt(0).toUpperCase();

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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{displayName} 👋</Text>
            <Text style={styles.dateText}>{todayString()}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.staffBadge}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.textInverse} />
            </View>
          </View>
        </View>

        {/* ── Status Banner ───────────────────────────────────── */}
        <View style={styles.statusBanner}>
          <LinearGradient
            colors={['rgba(126,232,162,0.1)', 'rgba(126,232,162,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Hệ thống đang hoạt động bình thường</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
        </View>

        {/* ── Stats Grid ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Tổng quan hôm nay</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { borderColor: `${s.color}22` }]}
            >
              <View style={[styles.statIconWrap, { backgroundColor: `${s.color}18` }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.actionList}>
          {QUICK_ACTIONS.map((action, i) => (
            <React.Fragment key={action.label}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigation?.navigate?.(action.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionSublabel}>{action.sublabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {i < QUICK_ACTIONS.length - 1 && <View style={styles.actionDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Shift info ──────────────────────────────────────── */}
        <View style={styles.shiftCard}>
          <LinearGradient
            colors={[COLORS.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shiftTopLine}
          />
          <View style={styles.shiftRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.gold} />
            <Text style={styles.shiftLabel}>Ca làm việc hiện tại</Text>
          </View>
          <Text style={styles.shiftValue}>
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — Đang hoạt động
          </Text>
          <Text style={styles.shiftSub}>Kéo xuống để làm mới dữ liệu</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  userName: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  dateText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 4 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C3A5F',
    borderWidth: 2,
    borderColor: '#60B4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#60B4FF', fontWeight: '700', fontSize: FONT_SIZES.md },
  staffBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#60B4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(126,232,162,0.2)',
    overflow: 'hidden',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7EE8A2',
  },
  statusText: { flex: 1, fontSize: FONT_SIZES.xs, color: '#7EE8A2' },

  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  actionList: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrap: { flex: 1 },
  actionLabel: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '500' },
  actionSublabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  actionDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 60 + SPACING.md },

  shiftCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    overflow: 'hidden',
  },
  shiftTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  shiftLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  shiftValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  shiftSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
});
