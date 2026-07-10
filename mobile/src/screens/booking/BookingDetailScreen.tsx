import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ScreenHeader, SectionTitle } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import type { BookingStatus, PaymentStatus } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingDetail'>;

const STATUS_LABELS: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Đã xác nhận', color: COLORS.staffBlue, bg: 'rgba(96,180,255,0.12)' },
  active: { label: 'Đang đỗ xe', color: COLORS.success, bg: 'rgba(76,175,80,0.12)' },
  completed: { label: 'Hoàn thành', color: COLORS.textMuted, bg: COLORS.surfaceElevated },
  cancelled: { label: 'Đã hủy', color: COLORS.error, bg: 'rgba(255,77,77,0.12)' },
  expired: { label: 'Hết hạn', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'Đã thanh toán',
  partially_refunded: 'Hoàn một phần',
  refunded: 'Đã hoàn tiền',
  failed: 'Thanh toán thất bại',
  pending: 'Chờ thanh toán',
};

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export const BookingDetailScreen = ({ navigation, route }: Props) => {
  const { bookings, isLoading, fetchBookings, getBookingById, checkInBooking, checkOutBooking } = useBooking();
  const [actionLoading, setActionLoading] = useState(false);
  const booking = getBookingById(route.params.bookingId);

  useEffect(() => {
    if (!booking && bookings.length === 0) {
      void fetchBookings();
    }
  }, [booking, bookings.length, fetchBookings]);

  const handleCheckIn = () => {
    Alert.alert('Check-in', 'Xác nhận check-in vào bãi xe?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Check-in',
        onPress: async () => {
          setActionLoading(true);
          try {
            await checkInBooking(route.params.bookingId);
          } catch (error) {
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Check-in thất bại');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCheckOut = () => {
    Alert.alert('Check-out', 'Xác nhận kết thúc phiên đỗ xe?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Check-out',
        onPress: async () => {
          setActionLoading(true);
          try {
            await checkOutBooking(route.params.bookingId);
            Alert.alert('Hoàn thành', 'Phiên đỗ xe đã kết thúc.');
          } catch (error) {
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Check-out thất bại');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (!booking) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#080808" />
        <ScreenHeader title="Chi tiết đặt chỗ" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.gold} size="large" />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Không tìm thấy đặt chỗ"
              message="Dữ liệu có thể đã thay đổi. Quay lại danh sách và làm mới."
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_LABELS[booking.status];
  const floorName = typeof booking.floorId === 'object' ? booking.floorId.name : booking.floorId;
  const canCheckIn = booking.status === 'confirmed';
  const canCheckOut = booking.status === 'active';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Chi tiết đặt chỗ" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <LinearGradient
            colors={[COLORS.gold, 'transparent']}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.cardTopLine}
          />
          <View style={styles.statusRow}>
            <View style={styles.slotCircle}>
              <Ionicons name="location" size={20} color={COLORS.gold} />
              <Text style={styles.slotBig}>{booking.slotCode}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
          {floorName ? <Text style={styles.floorName}>Tầng: {floorName}</Text> : null}
        </View>

        <View style={styles.section}>
          <SectionTitle>Thời gian đặt</SectionTitle>
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Vào lúc</Text>
              <Text style={styles.timeValue}>{format(new Date(booking.startTime), 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{format(new Date(booking.startTime), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.timeSep}>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
              <Text style={styles.timeDuration}>{booking.paidHours}h</Text>
            </View>
            <View style={[styles.timeBlock, styles.timeBlockRight]}>
              <Text style={styles.timeLabel}>Ra lúc</Text>
              <Text style={styles.timeValue}>{format(new Date(booking.endTime), 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{format(new Date(booking.endTime), 'dd/MM/yyyy')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Phương tiện</SectionTitle>
          <View style={styles.infoCard}>
            <View style={styles.plateBig}>
              <Text style={styles.plateBigText}>{booking.licensePlate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Thanh toán</SectionTitle>
          <View style={styles.infoCard}>
            <InfoRow label="Phương thức" value="Ví VALO" />
            <View style={styles.divider} />
            <InfoRow
              label="Trạng thái"
              value={PAYMENT_LABELS[booking.paymentStatus]}
              valueColor={booking.paymentStatus === 'paid' ? COLORS.success : undefined}
            />
            <View style={styles.divider} />
            <InfoRow label="Tạm tính" value={formatCurrency(booking.prepaidAmount)} />
            {booking.serviceAmount > 0 ? (
              <>
                <View style={styles.divider} />
                <InfoRow label="Dịch vụ" value={formatCurrency(booking.serviceAmount)} />
              </>
            ) : null}
            {(booking.refundAmount ?? 0) > 0 ? (
              <>
                <View style={styles.divider} />
                <InfoRow
                  label="Hoàn tiền"
                  value={`-${formatCurrency(booking.refundAmount ?? 0)}`}
                  valueColor={COLORS.success}
                />
              </>
            ) : null}
            <View style={[styles.divider, styles.strongDivider]} />
            <View style={styles.infoRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.finalAmount ?? booking.prepaidAmount ?? 0)}</Text>
            </View>
          </View>
        </View>

        {canCheckIn || canCheckOut ? (
          <View style={styles.actionsRow}>
            {canCheckIn ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={actionLoading}
                style={styles.checkInBtn}
                onPress={handleCheckIn}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.staffBlue} size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color={COLORS.staffBlue} />
                    <Text style={styles.checkInText}>Check-in</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            {canCheckOut ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={actionLoading}
                style={styles.checkoutBtn}
                onPress={handleCheckOut}
              >
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                  end={{ x: 1, y: 0 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.checkoutGrad}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={COLORS.textInverse} size="small" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={20} color={COLORS.textInverse} />
                      <Text style={styles.checkoutText}>Check-out</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  scroll: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: SPACING.sm,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  cardTopLine: { height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  slotCircle: { alignItems: 'center', flexDirection: 'row', gap: SPACING.xs },
  slotBig: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  statusPill: { borderRadius: RADIUS.round, paddingHorizontal: SPACING.md, paddingVertical: 5 },
  statusText: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
  floorName: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  section: { gap: SPACING.sm },
  timeRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: SPACING.lg,
  },
  timeBlock: { flex: 1 },
  timeBlockRight: { alignItems: 'flex-end' },
  timeLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  timeValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  timeDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  timeSep: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  timeDuration: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  plateBig: {
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  plateBigText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    letterSpacing: 3,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  infoValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  divider: { backgroundColor: COLORS.border, height: 1, marginVertical: 2 },
  strongDivider: { backgroundColor: COLORS.borderLight },
  totalLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  totalValue: { color: COLORS.gold, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  checkInBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(96,180,255,0.12)',
    borderColor: COLORS.staffBlue,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 52,
    justifyContent: 'center',
  },
  checkInText: { color: COLORS.staffBlue, fontSize: FONT_SIZES.md, fontWeight: '600' },
  checkoutBtn: { borderRadius: RADIUS.md, flex: 1, overflow: 'hidden' },
  checkoutGrad: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 52,
    justifyContent: 'center',
  },
  checkoutText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '700' },
});
