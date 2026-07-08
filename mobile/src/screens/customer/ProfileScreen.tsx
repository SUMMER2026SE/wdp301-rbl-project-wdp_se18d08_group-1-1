import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProfile, type Profile } from '../../api/profile.api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({
  icon,
  label,
  sublabel,
  iconColor,
  iconBg,
  onPress,
  showArrow = true,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  iconColor: string;
  iconBg: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuItem}>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: { navigation?: any }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch {
      // use auth context data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const displayName = profile?.fullName || user?.username || 'Người dùng';
  const email = profile?.email || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const roleBadge = user?.role === 'customer' ? 'Khách hàng' : user?.role ?? '';

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
          <Text style={styles.pageTitle}>Tài khoản</Text>
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
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <View style={styles.avatarRing}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                {/* Edit badge */}
                <TouchableOpacity style={styles.editBadge} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={12} color={COLORS.textInverse} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
                <View style={styles.rolePill}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.gold} />
                  <Text style={styles.rolePillText}>{roleBadge}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Account section ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Tài khoản của tôi</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="car-outline"
            label="Xe của tôi"
            sublabel="Quản lý phương tiện"
            iconColor="#7EE8A2"
            iconBg="rgba(126,232,162,0.12)"
            onPress={() => navigation?.navigate?.('MyVehicles')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="ribbon-outline"
            label="Gói Membership"
            sublabel="VIP & ưu đãi"
            iconColor="#FFD700"
            iconBg="rgba(255,215,0,0.12)"
            onPress={() => navigation?.navigate?.('Membership')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="receipt-outline"
            label="Lịch sử đỗ xe"
            sublabel="Xem lịch sử & hóa đơn"
            iconColor="#E07BE0"
            iconBg="rgba(224,123,224,0.12)"
            onPress={() => navigation?.navigate?.('ParkingHistory')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="wallet-outline"
            label="Ví VALO"
            sublabel={
              profile?.wallet?.balance !== undefined
                ? `Số dư: ${profile.wallet.balance.toLocaleString('vi-VN')}đ`
                : 'Quản lý số dư'
            }
            iconColor="#FF9F43"
            iconBg="rgba(255,159,67,0.12)"
            onPress={() => navigation?.navigate?.('Wallet')}
          />
        </View>

        {/* ── Settings section ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Cài đặt</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            label="Thông báo"
            iconColor="#60B4FF"
            iconBg="rgba(96,180,255,0.12)"
            onPress={() => navigation?.navigate?.('Notifications')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceElevated}
            onPress={() => {}}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="document-text-outline"
            label="Chính sách & Điều khoản"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.surfaceElevated}
            onPress={() => navigation?.navigate?.('PolicyList')}
          />
        </View>

        {/* ── Logout ──────────────────────────────────────────── */}
        <View style={[styles.menuCard, { marginBottom: SPACING.xl }]}>
          <MenuItem
            icon="log-out-outline"
            label="Đăng xuất"
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: FONT_SIZES.md, color: COLORS.textPrimary, fontWeight: '500' },
  menuSublabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 + SPACING.md },

  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
  },
});
