import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addMinutes, format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader, SectionTitle } from '@/components/common';
import {
  BookingActionModal,
  type BookingModalVariant,
} from '@/components/booking/BookingActionModal';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import type { CustomerTabParamList } from '@/navigation/CustomerNavigator';
import { vehiclesService } from '@/services/api/vehicles';
import { ParkingMap2D } from '@/components/booking/ParkingMap2D';
import bookingService from '@/services/BookingService';
import parkingFloorService from '@/services/ParkingFloorService';
import type { AvailableSlot, ParkingFloor } from '@/types/booking.types';
import type { Vehicle } from '@/types/models';
import { formatCurrency } from '@/utils/formatters';
import { subscriptionsService } from '@/services/api/subscriptions';

type Props = NativeStackScreenProps<BookingStackParamList, 'CreateBooking'>;

interface CreateFeedback {
  variant: BookingModalVariant;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const roundUpTo15Min = (date: Date) => {
  const ms = 1000 * 60 * 15;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
};

// generate time slots every 15 minutes: ['00:00', '00:15', ...]
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// next 14 days
const DATE_OPTIONS: Date[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  d.setHours(0, 0, 0, 0);
  return d;
});

// ── Time Picker Modal ────────────────────────────────────────────────────────
type TimePickerModalProps = {
  visible: boolean;
  title: string;
  initialDate: Date;
  minDate?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
};

function TimePickerModal({ visible, title, initialDate, minDate, onConfirm, onClose }: TimePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(() => format(initialDate, 'HH:mm'));

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate);
      setSelectedTime(format(initialDate, 'HH:mm'));
    }
  }, [visible, initialDate]);

  const minDateStr = minDate ? format(minDate, 'yyyy-MM-dd') : null;
  const minTimeStr = minDate && format(selectedDate, 'yyyy-MM-dd') === format(minDate, 'yyyy-MM-dd')
    ? format(minDate, 'HH:mm')
    : null;

  const handleConfirm = () => {
    const [h, m] = selectedTime.split(':').map(Number);
    const result = new Date(selectedDate);
    result.setHours(h, m, 0, 0);
    onConfirm(result);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mpStyles.overlay}>
        <View style={mpStyles.sheet}>
          <View style={mpStyles.header}>
            <Text style={mpStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Date selection */}
          <Text style={mpStyles.label}>Ngày</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mpStyles.dateRow}>
            {DATE_OPTIONS.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const active = format(selectedDate, 'yyyy-MM-dd') === dateStr;
              const disabled = minDateStr ? dateStr < minDateStr : false;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[mpStyles.datePill, active && mpStyles.datePillActive, disabled && mpStyles.datePillDisabled]}
                  onPress={() => !disabled && setSelectedDate(date)}
                  disabled={disabled}
                >
                  <Text style={[mpStyles.datePillDay, active && mpStyles.datePillTextActive, disabled && mpStyles.datePillTextDisabled]}>
                    {format(date, 'EEE').toUpperCase()}
                  </Text>
                  <Text style={[mpStyles.datePillDate, active && mpStyles.datePillTextActive, disabled && mpStyles.datePillTextDisabled]}>
                    {format(date, 'dd/MM')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time selection */}
          <Text style={mpStyles.label}>Giờ</Text>
          <ScrollView style={mpStyles.timeList} showsVerticalScrollIndicator={false}>
            <View style={mpStyles.timeGrid}>
              {TIME_OPTIONS.map((time) => {
                const active = selectedTime === time;
                const disabled = minTimeStr ? time < minTimeStr : false;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[mpStyles.timePill, active && mpStyles.timePillActive, disabled && mpStyles.timePillDisabled]}
                    onPress={() => !disabled && setSelectedTime(time)}
                    disabled={disabled}
                  >
                    <Text style={[mpStyles.timePillText, active && mpStyles.timePillTextActive, disabled && mpStyles.timePillTextDisabled]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={mpStyles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={mpStyles.confirmGrad}
            >
              <Text style={mpStyles.confirmText}>Xác nhận</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  label: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '700', marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 1 },
  dateRow: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  datePill: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 60,
  },
  datePillActive: { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: COLORS.gold },
  datePillDisabled: { opacity: 0.35 },
  datePillDay: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  datePillDate: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600', marginTop: 2 },
  datePillTextActive: { color: COLORS.gold },
  datePillTextDisabled: { color: COLORS.textMuted },
  timeList: { maxHeight: 200 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  timePill: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  timePillActive: { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: COLORS.gold },
  timePillDisabled: { opacity: 0.3 },
  timePillText: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  timePillTextActive: { color: COLORS.gold, fontWeight: '700' },
  timePillTextDisabled: { color: COLORS.textMuted },
  confirmBtn: { marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export const CreateBookingScreen = ({ navigation, route }: Props) => {
  const {
    availableSlots,
    bookingPolicy,
    parkingFloors,
    services,
    walletBalance,
    isLoading,
    error,
    fetchWalletBalance,
    fetchParkingFloors,
    fetchServices,
    getAvailableSlots,
    createBooking,
  } = useBooking();

  // ── Time state ────────────────────────────────────────────────────────────
  const [startTime, setStartTime] = useState<Date>(() => roundUpTo15Min(new Date()));
  const [endTime, setEndTime] = useState<Date>(() => addMinutes(roundUpTo15Min(new Date()), 60));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleError, setVehicleError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(10000);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CreateFeedback | null>(null);
  const [dbSlots, setDbSlots] = useState<any[] | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [activeHolds, setActiveHolds] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<ParkingFloor | null>(null);

  const selectedFloorId = route.params?.selectedFloorId;
  const selectedSlotCode = route.params?.selectedSlotCode;
  const selectedFloorName = route.params?.selectedFloorName;

  const fetchExtraData = useCallback(async () => {
    try {
      const [sessionsRes, holdsRes] = await Promise.all([
        bookingService.getActiveSessions(),
        bookingService.getActiveHolds(),
      ]);
      setActiveSessions(sessionsRes.data?.data || []);
      setActiveHolds(holdsRes.data?.data || []);
    } catch (err) {
      console.warn('Failed to fetch extra map data:', err);
    }
  }, []);

  useEffect(() => {
    void fetchExtraData();
  }, [fetchExtraData]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedFloor) return;
      setDbSlots(null);
      try {
        const floorId = selectedFloor._id ?? selectedFloor.id ?? String(selectedFloor.floorNumber);
        const slots = await parkingFloorService.getSlotsByFloor(floorId);
        setDbSlots(slots || []);
      } catch (err) {
        console.warn('Failed to fetch db slots:', err);
        setDbSlots([]);
      }
    };
    void fetchSlots();
  }, [selectedFloor]);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    setVehicleError('');
    try {
      const res = await vehiclesService.getMyVehicles();
      const approved = (res.data ?? []).filter((v) => !v.status || v.status === 'approved');
      setVehicles(approved);
      const defaultVehicle = approved.find((v) => v.isDefault) ?? approved[0];
      setSelectedVehicleId(defaultVehicle?.id ?? defaultVehicle?._id ?? '');
    } catch (e: unknown) {
      setVehicleError(e instanceof Error ? e.message : 'Không thể tải danh sách xe.');
    }
  }, []);

  const loadHourlyRate = useCallback(async () => {
    try {
      const res = await subscriptionsService.getPackages();
      const packages = (res as any)?.data ?? [];
      const hourlyPkg = packages.find((p: any) => p.type === 'hourly');
      if (hourlyPkg?.price) setHourlyRate(Number(hourlyPkg.price));
    } catch {
      // keep default 10000
    }
  }, []);

  useEffect(() => {
    void fetchWalletBalance().catch(() => undefined);
    void fetchParkingFloors();
    void fetchServices();
    void loadVehicles();
    void loadHourlyRate();
  }, [fetchWalletBalance, fetchParkingFloors, fetchServices, loadVehicles, loadHourlyRate]);

  useEffect(() => {
    const now = new Date();
    if (startTime > now && endTime > startTime) {
      void getAvailableSlots(startTime, endTime);
    }
  }, [endTime, getAvailableSlots, startTime]);

  useEffect(() => {
    const refreshLiveBookingState = () => {
      void fetchExtraData();
      if (startTime > new Date() && endTime > startTime) {
        void getAvailableSlots(startTime, endTime, { silent: true });
      }
    };
    const intervalId = setInterval(refreshLiveBookingState, 15000);
    return () => clearInterval(intervalId);
  }, [endTime, fetchExtraData, getAvailableSlots, startTime]);

  useEffect(() => {
    if (parkingFloors.length > 0 && !selectedFloor) {
      const preferredFloor = route.params?.selectedFloorId
        ? parkingFloors.find((f) => String(f._id ?? f.id ?? f.floorNumber) === route.params?.selectedFloorId)
        : parkingFloors[0];
      setSelectedFloor(preferredFloor ?? parkingFloors[0]);
    }
  }, [parkingFloors, route.params?.selectedFloorId, selectedFloor]);

  useEffect(() => {
    if (!selectedFloorId || !selectedSlotCode || dbSlots === null) return;
    const dbSlot = dbSlots.find(
      (slot) => String(slot.slotNumber || '').toUpperCase() === selectedSlotCode.toUpperCase(),
    );
    const matched = availableSlots.find(
      (s) => s.floorId === selectedFloorId && s.slotCode === selectedSlotCode,
    );
    setSelectedSlot(dbSlot?.reservedFor || dbSlot?.status === 'maintenance' ? null : matched ?? null);
  }, [availableSlots, dbSlots, selectedFloorId, selectedSlotCode]);

  useEffect(() => {
    if (!selectedSlot || isLoading) return;
    const stillAvailable = availableSlots.some(
      (s) => s.floorId === selectedSlot.floorId && s.slotCode === selectedSlot.slotCode,
    );
    if (!stillAvailable) setSelectedSlot(null);
  }, [availableSlots, isLoading, selectedSlot]);

  useEffect(() => {
    if (!selectedSlot || dbSlots === null) return;
    const dbSlot = dbSlots.find(
      (slot) => String(slot.slotNumber || '').toUpperCase() === selectedSlot.slotCode.toUpperCase(),
    );
    if (dbSlot?.reservedFor || dbSlot?.status === 'maintenance') {
      setSelectedSlot(null);
    }
  }, [dbSlots, selectedSlot]);

  // ── Derived values ────────────────────────────────────────────────────────
  const durationMs = Math.max(endTime.getTime() - startTime.getTime(), 0);
  const durationHours = Math.ceil(durationMs / 3_600_000);
  const paidHours = Math.max(durationHours, 1);
  const parkingCost = paidHours * hourlyRate;

  const serviceTotal = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s._id))
        .reduce((sum, s) => sum + Number(s.price || 0), 0),
    [services, selectedServiceIds],
  );

  const grandTotal = parkingCost + serviceTotal;
  const hasEnoughBalance = walletBalance >= grandTotal;
  const selectedVehicle = vehicles.find((v) => (v.id ?? v._id ?? '') === selectedVehicleId);
  const membershipBlocksRegisteredVehicle = Boolean(
    selectedVehicle && bookingPolicy?.requiresAssignedSlotUse,
  );
  const canBook = Boolean(
    selectedSlot &&
    selectedVehicleId &&
    hasEnoughBalance &&
    !membershipBlocksRegisteredVehicle &&
    !submitting &&
    durationMs >= 30 * 60 * 1000 &&
    durationMs <= 24 * 60 * 60 * 1000,
  );
  const selectedRouteSlotUnavailable =
    Boolean(selectedFloorId && selectedSlotCode) && !selectedSlot && !isLoading && availableSlots.length > 0;

  // ── Toggle service ────────────────────────────────────────────────────────
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  // ── Time picker callbacks ─────────────────────────────────────────────────
  const handleStartConfirm = (date: Date) => {
    setStartTime(date);
    if (endTime.getTime() - date.getTime() < 30 * 60 * 1000) {
      setEndTime(addMinutes(date, 60));
    }
  };

  const handleEndConfirm = (date: Date) => {
    const minEnd = addMinutes(startTime, 30);
    setEndTime(date < minEnd ? minEnd : date);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const showFeedback = (variant: BookingModalVariant, title: string, message: string) => {
    setFeedback({ variant, title, message });
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !selectedVehicleId) return;
    const now = new Date();
    if (startTime < now) {
      showFeedback('error', 'Thời gian không hợp lệ', 'Thời gian bắt đầu không thể ở quá khứ.');
      return;
    }
    if (durationMs < 30 * 60 * 1000) {
      showFeedback('warning', 'Thời lượng quá ngắn', 'Thời gian đặt chỗ tối thiểu là 30 phút.');
      return;
    }
    if (durationMs > 24 * 60 * 60 * 1000) {
      showFeedback('warning', 'Thời lượng quá dài', 'Thời gian đặt chỗ tối đa là 24 giờ.');
      return;
    }
    if (membershipBlocksRegisteredVehicle) {
      showFeedback(
        'warning',
        'Hãy sử dụng ô VIP trước',
        'Gói membership của bạn đang có ô VIP trống. Hãy cho một xe vào ô VIP trước; sau đó xe còn lại mới có thể đặt ô thường.',
      );
      return;
    }
    if (!hasEnoughBalance) {
      showFeedback(
        'warning',
        'Không đủ số dư',
        `Bạn cần ${formatCurrency(grandTotal)} nhưng ví chỉ còn ${formatCurrency(walletBalance)}. Hãy nạp thêm tiền vào ví.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      let bookingId: string | undefined;
      if (selectedVehicleId === 'manual') {
        if (!manualPlate.trim()) throw new Error('Vui lòng nhập biển số xe.');
        const response = await bookingService.createBulkBooking({
          idempotencyKey: Date.now().toString(),
          items: [{
            licensePlate: manualPlate.trim(),
            floorId: selectedSlot.floorId,
            slotCode: selectedSlot.slotCode,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            serviceIds: selectedServiceIds,
          }],
          paymentMethod: 'wallet',
        });

        const responseData = response.data?.data ?? response.data;
        const rawBooking = responseData?.bookings?.[0] ?? responseData?.items?.[0] ?? responseData?.booking;
        bookingId = bookingService.normalizeBooking(rawBooking)?._id;

        if (responseData?.checkoutUrl) {
          setFeedback({
            variant: 'info',
            title: 'Thanh toán VietQR',
            message: 'Vui lòng hoàn tất thanh toán để giữ chỗ.',
            primaryLabel: 'Đã hiểu',
            onPrimary: () => navigation.goBack(),
          });
          return;
        }
      } else {
        const booking = await createBooking({
          vehicleId: selectedVehicleId,
          floorId: selectedSlot.floorId,
          slotCode: selectedSlot.slotCode,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          serviceIds: selectedServiceIds,
          paymentMethod: 'wallet',
        });
        bookingId = booking._id;
      }

      setCreatedBookingId(bookingId ?? null);
      setShowSuccessModal(true);
    } catch (submitError) {
      showFeedback(
        'error',
        'Đặt chỗ thất bại',
        submitError instanceof Error ? submitError.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Đặt chỗ mới" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Time Summary Card ─────────────────────────────── */}
          <View style={styles.timeSummary}>
            <LinearGradient
              colors={[COLORS.gold, 'transparent']}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.cardTopLine}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Vào</Text>
                <Text style={styles.timeValue}>{format(startTime, 'HH:mm')}</Text>
                <Text style={styles.timeDate}>{format(startTime, 'dd/MM/yyyy')}</Text>
              </View>
              <View style={styles.timeSep}>
                <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                <Text style={styles.timeDur}>{durationHours}h</Text>
              </View>
              <View style={[styles.timeBlock, styles.timeBlockRight]}>
                <Text style={styles.timeLabel}>Ra</Text>
                <Text style={styles.timeValue}>{format(endTime, 'HH:mm')}</Text>
                <Text style={styles.timeDate}>{format(endTime, 'dd/MM/yyyy')}</Text>
              </View>
            </View>
          </View>

          {/* ── Time Pickers ──────────────────────────────────── */}
          <View style={styles.section}>
            <SectionTitle>Thời gian</SectionTitle>
            <View style={styles.timePickerRow}>
              <TouchableOpacity
                style={styles.timePickerCard}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.timePickerIcon}>
                  <Ionicons name="log-in-outline" size={18} color={COLORS.gold} />
                </View>
                <View>
                  <Text style={styles.timePickerLabel}>Vào</Text>
                  <Text style={styles.timePickerValue}>{format(startTime, 'HH:mm')}</Text>
                  <Text style={styles.timePickerDate}>{format(startTime, 'dd/MM/yyyy')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerCard}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.timePickerIcon}>
                  <Ionicons name="log-out-outline" size={18} color={COLORS.staffBlue} />
                </View>
                <View>
                  <Text style={styles.timePickerLabel}>Ra</Text>
                  <Text style={styles.timePickerValue}>{format(endTime, 'HH:mm')}</Text>
                  <Text style={styles.timePickerDate}>{format(endTime, 'dd/MM/yyyy')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Vehicle ───────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionTitle>Xe của bạn</SectionTitle>
            {vehicleError ? (
              <ErrorState message={vehicleError} onRetry={loadVehicles} />
            ) : vehicles.length === 0 ? (
              <EmptyState
                icon="car-outline"
                title="Chưa có xe đã duyệt"
                message="Thêm hoặc chờ duyệt xe trong Hồ sơ trước khi đặt chỗ."
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {vehicles.map((vehicle) => {
                  const vehicleId = vehicle.id ?? vehicle._id ?? '';
                  const active = selectedVehicleId === vehicleId;
                  return (
                    <Pressable
                      key={vehicleId}
                      style={[styles.vehiclePill, active && styles.vehiclePillActive]}
                      onPress={() => setSelectedVehicleId(vehicleId)}
                    >
                      <Ionicons name="car-outline" size={16} color={active ? COLORS.gold : COLORS.textMuted} />
                      <Text style={[styles.vehicleText, active && styles.vehicleTextActive]}>
                        {vehicle.licensePlate}
                      </Text>
                      {vehicle.isDefault ? <View style={styles.defaultDot} /> : null}
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.vehiclePill, selectedVehicleId === 'manual' && styles.vehiclePillActive]}
                  onPress={() => setSelectedVehicleId('manual')}
                >
                  <Ionicons name="create-outline" size={16} color={selectedVehicleId === 'manual' ? COLORS.gold : COLORS.textMuted} />
                  <Text style={[styles.vehicleText, selectedVehicleId === 'manual' && styles.vehicleTextActive]}>
                    Biển số ngoài
                  </Text>
                </Pressable>
              </ScrollView>
            )}

            {selectedVehicleId === 'manual' && (
              <View style={{ marginTop: 12 }}>
                <TextInput
                  style={[styles.input, { borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 8, color: COLORS.textPrimary }]}
                  placeholder="Nhập biển số xe (VD: 30A-12345)"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualPlate}
                  onChangeText={setManualPlate}
                  autoCapitalize="characters"
                />
              </View>
            )}
            {membershipBlocksRegisteredVehicle ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Membership đang có ô VIP trống. Hãy cho một xe vào ô VIP trước, rồi mới đặt ô thường cho xe còn lại.
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Slot Map ──────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionTitle>Vị trí đỗ</SectionTitle>

            {selectedSlot ? (
              <View style={styles.selectedSlotCard}>
                <View style={styles.selectedSlotIcon}>
                  <Ionicons name="location" size={20} color={COLORS.staffBlue} />
                </View>
                <View style={styles.selectedSlotInfo}>
                  <Text style={styles.selectedSlotCode}>{selectedSlot.slotCode}</Text>
                  <Text style={styles.selectedSlotMeta}>
                    {selectedSlot.floorName ?? selectedFloorName ?? selectedSlot.floorId}
                    {selectedVehicle ? ` • ${selectedVehicle.licensePlate}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSlot(null)} style={styles.clearSlotBtn}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ) : selectedRouteSlotUnavailable ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Vị trí {selectedSlotCode} không còn trống. Vui lòng chọn vị trí khác.
                </Text>
              </View>
            ) : null}

            {parkingFloors.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.floorTabs}
                style={styles.floorTabScroll}
              >
                {parkingFloors.map((floor) => {
                  const floorId = floor._id ?? floor.id ?? String(floor.floorNumber);
                  const active = selectedFloor && (selectedFloor._id ?? selectedFloor.id ?? String(selectedFloor.floorNumber)) === floorId;
                  const floorCount = availableSlots.filter((s) => s.floorId === floorId).length;
                  return (
                    <Pressable
                      key={floorId}
                      style={[styles.floorTab, active && styles.floorTabActive]}
                      onPress={() => { setSelectedFloor(floor); setSelectedSlot(null); }}
                    >
                      <Text style={[styles.floorTabText, active && styles.floorTabTextActive]}>{floor.name}</Text>
                      <View style={[styles.floorCount, active && styles.floorCountActive]}>
                        <Text style={[styles.floorCountText, active && styles.floorCountTextActive]}>{floorCount}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 8, justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ borderRadius: 5, height: 10, width: 10, backgroundColor: '#7EE8A2' }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Trống</Text>
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ borderRadius: 5, height: 10, width: 10, backgroundColor: '#FF6B6B' }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Có xe</Text>
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ borderRadius: 5, height: 10, width: 10, backgroundColor: '#FFD700' }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>VIP</Text>
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ borderRadius: 5, height: 10, width: 10, backgroundColor: '#FFA500' }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Giữ chỗ</Text>
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <View style={{ borderRadius: 5, height: 10, width: 10, backgroundColor: '#A0A0A0' }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Bảo trì</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.mapCanvas}>
                {isLoading || dbSlots === null ? (
                  <View style={styles.mapState}>
                    <ActivityIndicator color={COLORS.gold} size="large" />
                    <Text style={styles.mapStateText}>Đang tải sơ đồ...</Text>
                  </View>
                ) : error ? (
                  <View style={styles.mapState}>
                    <ErrorState
                      message={error}
                      onRetry={() => {
                        void fetchParkingFloors();
                        void getAvailableSlots(startTime, endTime);
                      }}
                    />
                  </View>
                ) : !selectedFloor ? (
                  <View style={styles.mapState}>
                    <EmptyState icon="layers-outline" title="Chưa có tầng" message="Không tìm thấy tầng bãi xe." />
                  </View>
                ) : (
                  <ParkingMap2D
                    floor={selectedFloor}
                    floorSlots={availableSlots.filter(
                      (s) => s.floorId === (selectedFloor._id ?? selectedFloor.id ?? String(selectedFloor.floorNumber)),
                    )}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSelectedSlot}
                    dbSlots={dbSlots}
                    activeSessions={activeSessions}
                    activeHolds={activeHolds}
                  />
                )}
              </View>
            </ScrollView>
          </View>

          {/* ── Extra Services ────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionTitle>Dịch vụ thêm</SectionTitle>
              {serviceTotal > 0 && (
                <Text style={styles.serviceTotalBadge}>+{formatCurrency(serviceTotal)}</Text>
              )}
            </View>

            {services.length === 0 ? (
              <View style={styles.emptyServices}>
                <Text style={styles.emptyServicesText}>Không có dịch vụ khả dụng.</Text>
              </View>
            ) : (
              <View style={styles.serviceList}>
                {services.map((service) => {
                  const selected = selectedServiceIds.includes(service._id);
                  return (
                    <TouchableOpacity
                      key={service._id}
                      style={[styles.serviceItem, selected && styles.serviceItemActive]}
                      onPress={() => toggleService(service._id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.serviceCheckbox, selected && styles.serviceCheckboxActive]}>
                        {selected && <Ionicons name="checkmark" size={12} color={COLORS.textInverse} />}
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        {(service.estimatedTime || service.estimatedTimeMinutes) ? (
                          <Text style={styles.serviceDuration}>
                            {service.estimatedTime ?? service.estimatedTimeMinutes} phút
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Price Summary ─────────────────────────────────── */}
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Đơn giá / giờ</Text>
              <Text style={styles.priceValue}>{formatCurrency(hourlyRate)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Thời gian tính phí</Text>
              <Text style={styles.priceValue}>{paidHours} giờ</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Phí đỗ xe</Text>
              <Text style={styles.priceValue}>{formatCurrency(parkingCost)}</Text>
            </View>
            {serviceTotal > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Dịch vụ thêm</Text>
                <Text style={styles.priceValue}>{formatCurrency(serviceTotal)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.priceTotal]}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
            <View style={styles.walletRow}>
              <Ionicons
                name="wallet-outline"
                size={14}
                color={hasEnoughBalance ? COLORS.success : COLORS.error}
              />
              <Text style={[styles.walletText, { color: hasEnoughBalance ? COLORS.success : COLORS.error }]}>
                Số dư ví: {formatCurrency(walletBalance)}
                {hasEnoughBalance ? '' : ' — không đủ'}
              </Text>
            </View>
          </View>

          {/* ── Submit Button ─────────────────────────────────── */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canBook}
            style={[styles.submitBtn, !canBook && styles.submitDisabled]}
            onPress={handleSubmit}
          >
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.submitGrad}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textInverse} />
                  <Text style={styles.submitText}>Xác nhận đặt chỗ</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BookingActionModal
        message={`Vị trí ${selectedSlot?.slotCode ?? '--'} đã được giữ.\nSố tiền đã thanh toán: ${formatCurrency(grandTotal)}`}
        primaryLabel="Xem chi tiết đặt chỗ"
        secondaryLabel="Danh sách đặt chỗ"
        title="Đặt chỗ thành công! 🎉"
        variant="success"
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onPrimary={() => {
          setShowSuccessModal(false);
          const parentNavigation = navigation.getParent<BottomTabNavigationProp<CustomerTabParamList>>();
          if (createdBookingId) {
            parentNavigation?.navigate('ProfileTab', {
              screen: 'BookingDetail',
              params: { bookingId: createdBookingId },
            });
          } else {
            parentNavigation?.navigate('ProfileTab', { screen: 'BookingList' });
          }
        }}
        onSecondary={() => {
          setShowSuccessModal(false);
          navigation
            .getParent<BottomTabNavigationProp<CustomerTabParamList>>()
            ?.navigate('ProfileTab', { screen: 'BookingList' });
        }}
      />

      <BookingActionModal
        message={feedback?.message}
        primaryLabel={feedback?.primaryLabel ?? 'Đóng'}
        title={feedback?.title ?? ''}
        variant={feedback?.variant ?? 'info'}
        visible={Boolean(feedback)}
        onClose={() => setFeedback(null)}
        onPrimary={() => {
          const callback = feedback?.onPrimary;
          setFeedback(null);
          callback?.();
        }}
      />

      {/* ── Time Picker Modals ─────────────────────────────────── */}
      <TimePickerModal
        visible={showStartPicker}
        title="Chọn thời gian vào"
        initialDate={startTime}
        minDate={new Date()}
        onConfirm={handleStartConfirm}
        onClose={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        title="Chọn thời gian ra"
        initialDate={endTime}
        minDate={addMinutes(startTime, 30)}
        onConfirm={handleEndConfirm}
        onClose={() => setShowEndPicker(false)}
      />
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { gap: SPACING.lg, padding: SPACING.lg, paddingBottom: SPACING.xxl },

  timeSummary: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  cardTopLine: { height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  timeRow: { alignItems: 'center', flexDirection: 'row' },
  timeBlock: { flex: 1 },
  timeBlockRight: { alignItems: 'flex-end' },
  timeLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  timeValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  timeDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  timeSep: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  timeDur: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },

  section: { gap: SPACING.sm },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },

  // Time picker cards
  timePickerRow: { gap: SPACING.sm },
  timePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  timePickerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  timePickerValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  timePickerDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },

  // Vehicle
  pillRow: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  vehiclePill: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
  },
  vehiclePillActive: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: COLORS.gold },
  vehicleText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  vehicleTextActive: { color: COLORS.gold },
  defaultDot: { backgroundColor: COLORS.gold, borderRadius: 3, height: 6, marginLeft: 2, width: 6 },

  // Slot
  selectedSlotCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(96,180,255,0.35)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  selectedSlotIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(96,180,255,0.12)',
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectedSlotInfo: { flex: 1 },
  selectedSlotCode: { color: COLORS.staffBlue, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  selectedSlotMeta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: 2 },
  clearSlotBtn: { padding: 4 },
  warningBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,159,67,0.1)',
    borderColor: 'rgba(255,159,67,0.24)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  warningText: { color: COLORS.warning, flex: 1, fontSize: FONT_SIZES.sm, lineHeight: 20 },

  // Floor tabs
  floorTabScroll: { maxHeight: 44, marginTop: SPACING.sm },
  floorTabs: { alignItems: 'center', gap: SPACING.sm, paddingBottom: SPACING.sm },
  floorTab: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  floorTabActive: { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: COLORS.gold },
  floorTabText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  floorTabTextActive: { color: COLORS.gold },
  floorCount: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.round,
    minWidth: 20,
    paddingHorizontal: 5,
  },
  floorCountActive: { backgroundColor: COLORS.gold },
  floorCountText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  floorCountTextActive: { color: COLORS.textInverse },

  // Map
  mapCanvas: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginVertical: SPACING.md,
    minHeight: 300,
    position: 'relative',
    overflow: 'hidden',
  },
  mapState: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    minHeight: 300,
    position: 'absolute',
    right: 0,
    top: 0,
    padding: SPACING.xl,
  },
  mapStateText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, marginTop: SPACING.md },

  // Services
  serviceTotalBadge: { color: COLORS.gold, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  emptyServices: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  emptyServicesText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, textAlign: 'center' },
  serviceList: { gap: SPACING.xs },
  serviceItem: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  serviceItemActive: { backgroundColor: 'rgba(212,175,55,0.08)', borderColor: COLORS.gold },
  serviceCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCheckboxActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  serviceInfo: { flex: 1 },
  serviceName: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  serviceDuration: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  servicePrice: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '700' },

  // Price summary
  priceSummary: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.xs,
    padding: SPACING.md,
  },
  priceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  priceLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  priceValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  priceTotal: {
    borderTopColor: COLORS.borderLight,
    borderTopWidth: 1,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  totalLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  totalValue: { color: COLORS.gold, fontSize: FONT_SIZES.xl, fontWeight: '800' },
  walletRow: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  walletText: { fontSize: FONT_SIZES.xs },

  // Submit
  submitBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  submitDisabled: { opacity: 0.5 },
  submitGrad: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 56,
    justifyContent: 'center',
  },
  submitText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '700' },
  input: { backgroundColor: COLORS.surfaceElevated },
});
