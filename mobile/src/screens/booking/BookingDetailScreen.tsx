import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ScreenHeader, SectionTitle } from '@/components/common';
import {
  BookingActionModal,
  type BookingModalVariant,
} from '@/components/booking/BookingActionModal';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import type { BookingStatus, PaymentStatus } from '@/types/booking.types';
import { canExtendBookingBy, getBookingActionAvailability } from '@/utils/bookingActions';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingDetail'>;

interface ActionDialog {
  variant: BookingModalVariant;
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  destructive?: boolean;
  onConfirm?: () => Promise<void>;
}

const EXTENSION_OPTIONS = [30, 60, 120];

const STATUS_LABELS: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ thanh toán', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
  confirmed: { label: 'Đã xác nhận', color: COLORS.staffBlue, bg: 'rgba(96,180,255,0.12)' },
  active: { label: 'Đang đỗ xe', color: COLORS.success, bg: 'rgba(76,175,80,0.12)' },
  paused: { label: 'Tạm dừng', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
  completed: { label: 'Hoàn thành', color: COLORS.textMuted, bg: COLORS.surfaceElevated },
  cancelled: { label: 'Đã hủy', color: COLORS.error, bg: 'rgba(255,77,77,0.12)' },
  expired: { label: 'Hết hạn', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
};

function safeFormat(dateValue: string, pattern: string) {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? 'N/A' : format(date, pattern);
}

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
  const {
    isLoading,
    fetchBookings,
    getBookingById,
    checkInBooking,
    checkOutBooking,
    cancelBooking,
    extendBooking,
  } = useBooking();
  const [actionLoading, setActionLoading] = useState(false);
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendingMinutes, setExtendingMinutes] = useState<number | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const booking = getBookingById(route.params.bookingId);

  useEffect(() => {
    if (!booking) {
      void fetchBookings();
    }
  }, [booking, fetchBookings]);

  const showFeedback = (variant: BookingModalVariant, title: string, message: string) => {
    setActionDialog({ variant, title, message, primaryLabel: 'Đóng' });
  };

  const runAction = async (
    action: () => Promise<void>,
    successTitle: string,
    successMessage: string,
    fallbackError: string,
  ) => {
    setActionLoading(true);
    try {
      await action();
      showFeedback('success', successTitle, successMessage);
    } catch (error) {
      showFeedback('error', 'Không thể thực hiện', error instanceof Error ? error.message : fallbackError);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDialogPrimary = () => {
    if (!actionDialog?.onConfirm) {
      setActionDialog(null);
      return;
    }

    void actionDialog.onConfirm();
  };

  const handleCheckIn = () => {
    setActionDialog({
      variant: 'info',
      title: 'Xác nhận Check-in',
      message: 'Bạn đã đến đúng ô đỗ và muốn bắt đầu phiên gửi xe?',
      primaryLabel: 'Check-in ngay',
      secondaryLabel: 'Để sau',
      onConfirm: () =>
        runAction(
          () => checkInBooking(route.params.bookingId),
          'Check-in thành công',
          'Phiên gửi xe của bạn đã bắt đầu.',
          'Check-in thất bại',
        ),
    });
  };

  const handleCheckOut = () => {
    setActionDialog({
      variant: 'warning',
      title: 'Kết thúc phiên gửi xe?',
      message: 'Hệ thống sẽ tính phí thực tế và tự động thu thêm hoặc hoàn tiền vào ví.',
      primaryLabel: 'Xác nhận Check-out',
      secondaryLabel: 'Tiếp tục gửi',
      onConfirm: () =>
        runAction(
          () => checkOutBooking(route.params.bookingId),
          'Check-out thành công',
          'Phiên gửi xe đã kết thúc và số dư ví đã được cập nhật.',
          'Check-out thất bại',
        ),
    });
  };

  const handleCancel = () => {
    if (!booking) return;

    setActionDialog({
      variant: 'error',
      title: 'Hủy đặt chỗ?',
      message: `${formatCurrency(booking.prepaidAmount)} sẽ được hoàn lại vào ví VALO sau khi hủy.`,
      primaryLabel: 'Xác nhận hủy',
      secondaryLabel: 'Giữ đặt chỗ',
      destructive: true,
      onConfirm: () =>
        runAction(
          () => cancelBooking(booking._id),
          'Đã hủy đặt chỗ',
          'Tiền đặt trước đã được hoàn lại vào ví VALO.',
          'Hủy đặt chỗ thất bại',
        ),
    });
  };

  const handleExtend = async (minutes: number) => {
    if (!booking) return;

    const currentEnd = new Date(booking.endTime);
    if (Number.isNaN(currentEnd.getTime())) {
      showFeedback('error', 'Không thể gia hạn', 'Thời gian kết thúc hiện tại không hợp lệ.');
      return;
    }

    if (!canExtendBookingBy(booking, minutes)) {
      showFeedback('warning', 'Vượt giới hạn thời gian', 'Tổng thời lượng đặt chỗ không được vượt quá 24 giờ.');
      return;
    }

    const newEnd = new Date(currentEnd.getTime() + minutes * 60_000);
    setExtendingMinutes(minutes);
    setActionLoading(true);
    try {
      await extendBooking(booking._id, {
        newStart: booking.startTime,
        newEnd: newEnd.toISOString(),
      });
      setExtendModalVisible(false);
      showFeedback(
        'success',
        'Gia hạn thành công',
        `Giờ kết thúc mới: ${safeFormat(newEnd.toISOString(), 'HH:mm dd/MM/yyyy')}`,
      );
    } catch (error) {
      setExtendModalVisible(false);
      showFeedback(
        'error',
        'Không thể gia hạn',
        error instanceof Error ? error.message : 'Gia hạn đặt chỗ thất bại',
      );
    } finally {
      setExtendingMinutes(null);
      setActionLoading(false);
    }
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
  const { canCancel, canCheckIn, canCheckOut, canExtend } = getBookingActionAvailability(booking);

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
              <Text style={styles.timeValue}>{safeFormat(booking.startTime, 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{safeFormat(booking.startTime, 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.timeSep}>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textMuted} />
              <Text style={styles.timeDuration}>{booking.paidHours}h</Text>
            </View>
            <View style={[styles.timeBlock, styles.timeBlockRight]}>
              <Text style={styles.timeLabel}>Ra lúc</Text>
              <Text style={styles.timeValue}>{safeFormat(booking.endTime, 'HH:mm')}</Text>
              <Text style={styles.timeDate}>{safeFormat(booking.endTime, 'dd/MM/yyyy')}</Text>
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
            <InfoRow label="Phương thức" value={booking.paymentMethod === 'vietqr' ? 'VietQR' : 'Ví VALO'} />
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

        {canExtend || canCancel ? (
          <View style={styles.managementRow}>
            {canExtend ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={actionLoading}
                style={[styles.managementBtn, styles.extendBtn]}
                onPress={() => setExtendModalVisible(true)}
              >
                <Ionicons name="time-outline" size={19} color={COLORS.gold} />
                <Text style={styles.extendText}>Gia hạn</Text>
              </TouchableOpacity>
            ) : null}
            {canCancel ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={actionLoading}
                style={[styles.managementBtn, styles.cancelBtn]}
                onPress={handleCancel}
              >
                <Ionicons name="trash-outline" size={19} color={COLORS.error} />
                <Text style={styles.cancelText}>Hủy đặt chỗ</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

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

      <Modal
        animationType="fade"
        transparent
        visible={extendModalVisible}
        onRequestClose={() => setExtendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconGlow}>
              <Ionicons name="time" size={70} color={COLORS.gold} />
            </View>
            <Text style={styles.modalTitle}>Gia hạn đặt chỗ</Text>
            <Text style={styles.modalSubtitle}>
              Giờ kết thúc hiện tại: {safeFormat(booking.endTime, 'HH:mm dd/MM/yyyy')}
            </Text>
            <Text style={styles.modalHint}>Chọn thời gian muốn gia hạn</Text>
            <View style={styles.extensionOptions}>
              {EXTENSION_OPTIONS.map((minutes) => {
                const optionAvailable = canExtendBookingBy(booking, minutes);
                return (
                  <TouchableOpacity
                    key={minutes}
                    activeOpacity={0.8}
                    disabled={actionLoading || !optionAvailable}
                    style={[styles.extensionOption, !optionAvailable && styles.extensionOptionDisabled]}
                    onPress={() => void handleExtend(minutes)}
                  >
                    {extendingMinutes === minutes ? (
                      <ActivityIndicator color={COLORS.gold} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color={optionAvailable ? COLORS.gold : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.extensionOptionText,
                            !optionAvailable && styles.extensionOptionTextDisabled,
                          ]}
                        >
                          +{minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.modalNote}>Phí phát sinh sẽ được trừ từ ví sau khi hệ thống kiểm tra ô đỗ.</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={actionLoading}
              style={styles.modalCloseBtn}
              onPress={() => setExtendModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BookingActionModal
        destructive={actionDialog?.destructive}
        loading={actionLoading}
        message={actionDialog?.message}
        primaryLabel={actionDialog?.primaryLabel ?? 'Đóng'}
        secondaryLabel={actionDialog?.secondaryLabel}
        title={actionDialog?.title ?? ''}
        variant={actionDialog?.variant ?? 'info'}
        visible={Boolean(actionDialog)}
        onClose={() => {
          if (!actionLoading) setActionDialog(null);
        }}
        onPrimary={handleDialogPrimary}
      />
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
  managementRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  managementBtn: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 52,
    justifyContent: 'center',
  },
  extendBtn: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: COLORS.gold },
  extendText: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '600' },
  cancelBtn: { backgroundColor: 'rgba(255,77,77,0.1)', borderColor: COLORS.error },
  cancelText: { color: COLORS.error, fontSize: FONT_SIZES.md, fontWeight: '600' },
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
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    width: '100%',
  },
  modalIconGlow: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: RADIUS.round,
    height: 92,
    justifyContent: 'center',
    marginBottom: SPACING.md,
    width: 92,
  },
  modalTitle: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  modalHint: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600', marginTop: SPACING.lg },
  extensionOptions: { gap: SPACING.sm, marginTop: SPACING.md, width: '100%' },
  extensionOption: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 50,
    justifyContent: 'center',
  },
  extensionOptionText: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '700' },
  extensionOptionDisabled: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border, opacity: 0.55 },
  extensionOptionTextDisabled: { color: COLORS.textMuted },
  modalNote: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: 50,
    width: '100%',
  },
  modalCloseText: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '600' },
});
