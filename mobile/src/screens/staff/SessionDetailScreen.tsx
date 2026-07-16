import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import type { StaffSessionStackParamList } from './SessionListScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<StaffSessionStackParamList, 'SessionDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, valueColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  kiosk:       'Self-service kiosk',
  app_booking: 'App booking',
  booking:     'Booked',
  walk_in:     'Walk-in',
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car:           'Car',
  electric_car:  'Electric car',
  motorcycle:    'Motorcycle',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export const SessionDetailScreen = ({ navigation, route }: Props) => {
  const { session } = route.params;

  const checkIn  = new Date(session.checkInTime);
  const checkOut = session.checkOutTime ? new Date(session.checkOutTime) : null;

  const elapsedMins = checkOut
    ? Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
    : Math.floor((Date.now() - checkIn.getTime()) / 60000);
  const hours = Math.floor(elapsedMins / 60);
  const mins  = elapsedMins % 60;

  const isActive = session.status === 'active';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={isActive ? [COLORS.gold, 'transparent'] : [COLORS.textMuted, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cardTopLine}
          />
          <View style={styles.heroTop}>
            <View style={styles.plateWrap}>
              <Text style={styles.plateText}>{session.licensePlate}</Text>
            </View>
            <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeDone]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#7EE8A2' : COLORS.textMuted }]} />
              <Text style={[styles.statusText, { color: isActive ? '#7EE8A2' : COLORS.textMuted }]}>
                {isActive ? 'Active' : 'Completed'}
              </Text>
            </View>
          </View>

          <View style={styles.heroSlot}>
            <Ionicons name="location" size={16} color={COLORS.gold} />
            <Text style={styles.heroSlotText}>{session.parkingSlot ?? 'Space not assigned'}</Text>
          </View>

          {/* Time bar */}
          <View style={styles.timeBar}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={styles.timeVal}>{format(checkIn, 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{format(checkIn, 'dd/MM')}</Text>
            </View>
            <View style={styles.timeMid}>
              <Text style={styles.durationText}>
                {hours > 0 ? `${hours}g ` : ''}{mins}ph
              </Text>
              <View style={styles.durationLine} />
              {isActive && <View style={styles.pulsingDot} />}
            </View>
            <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.timeLabel}>Check-out</Text>
              {checkOut ? (
                <>
                  <Text style={styles.timeVal}>{format(checkOut, 'HH:mm')}</Text>
                  <Text style={styles.timeDate}>{format(checkOut, 'dd/MM')}</Text>
                </>
              ) : (
                <Text style={[styles.timeVal, { color: COLORS.textMuted }]}>--:--</Text>
              )}
            </View>
          </View>
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="car-outline" label="Vehicle type"
              value={VEHICLE_TYPE_LABELS[session.vehicleType ?? ''] ?? session.vehicleType ?? 'Unknown'} />
            {session.source && (
              <>
                <View style={styles.divider} />
                <InfoRow icon="git-branch-outline" label="Entry source" value={SOURCE_LABELS[session.source] ?? session.source} />
              </>
            )}
          </View>
        </View>

        {/* Contact */}
        {session.phone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer contact</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="call-outline" label="Phone number" value={session.phone} />
            </View>
          </View>
        )}

        {/* Payment */}
        {session.totalPrice !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.infoCard}>
              <InfoRow
                icon="wallet-outline"
                label="Status"
                value={session.paymentStatus ?? 'Pending'}
                valueColor={session.paymentStatus === 'paid' ? '#7EE8A2' : undefined}
              />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(session.totalPrice ?? 0)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ID reference */}
        <Text style={styles.idRef}>ID: {session._id}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },

  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(96,180,255,0.2)', overflow: 'hidden', gap: SPACING.sm,
  },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plateWrap: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  plateText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 3 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.round,
  },
  statusBadgeActive: { backgroundColor: 'rgba(126,232,162,0.12)' },
  statusBadgeDone:   { backgroundColor: COLORS.surfaceElevated },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  heroSlot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroSlotText: { fontSize: FONT_SIZES.md, color: COLORS.gold, fontWeight: '600' },

  timeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
  },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  timeVal:   { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  timeDate:  { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  timeMid: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  durationText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '600', marginBottom: 4 },
  durationLine: { width: 40, height: 1, backgroundColor: COLORS.border },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7EE8A2', marginTop: 4 },

  section: { gap: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  infoValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  totalLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  totalValue: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.gold },

  idRef: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
});
