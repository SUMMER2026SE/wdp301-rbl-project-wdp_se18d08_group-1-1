import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addHours, format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader, SectionTitle } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import { vehiclesService } from '@/services/api/vehicles';
import type { AvailableSlot } from '@/types/booking.types';
import type { Vehicle } from '@/types/models';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'CreateBooking'>;

const DURATION_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const HOURLY_RATE = 10000;

export const CreateBookingScreen = ({ navigation, route }: Props) => {
  const {
    availableSlots,
    walletBalance,
    isLoading,
    error,
    fetchWalletBalance,
    getAvailableSlots,
    createBooking,
  } = useBooking();

  const now = useMemo(() => {
    const date = new Date();
    date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0);
    return date;
  }, []);

  const [durationHours, setDurationHours] = useState(2);
  const [startTime] = useState(now);
  const endTime = useMemo(() => addHours(startTime, durationHours), [durationHours, startTime]);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleError, setVehicleError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedFloorId = route.params?.selectedFloorId;
  const selectedSlotCode = route.params?.selectedSlotCode;
  const selectedFloorName = route.params?.selectedFloorName;

  const loadVehicles = useCallback(async () => {
    setVehicleError('');
    try {
      const res = await vehiclesService.getMyVehicles();
      const approved = (res.data ?? []).filter((vehicle) => !vehicle.status || vehicle.status === 'approved');
      setVehicles(approved);
      const defaultVehicle = approved.find((vehicle) => vehicle.isDefault) ?? approved[0];
      setSelectedVehicleId(defaultVehicle?.id ?? defaultVehicle?._id ?? '');
    } catch (loadError: unknown) {
      setVehicleError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách xe.');
    }
  }, []);

  useEffect(() => {
    void fetchWalletBalance().catch(() => undefined);
    void loadVehicles();
  }, [fetchWalletBalance, loadVehicles]);

  useEffect(() => {
    void getAvailableSlots(startTime, endTime);
  }, [endTime, getAvailableSlots, startTime]);

  useEffect(() => {
    if (!selectedFloorId || !selectedSlotCode) return;

    const matchedSlot = availableSlots.find(
      (slot) => slot.floorId === selectedFloorId && slot.slotCode === selectedSlotCode,
    );

    if (matchedSlot) {
      setSelectedSlot(matchedSlot);
    } else {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedFloorId, selectedSlotCode]);

  useEffect(() => {
    if (!selectedSlot || isLoading) return;

    const stillAvailable = availableSlots.some(
      (slot) => slot.floorId === selectedSlot.floorId && slot.slotCode === selectedSlot.slotCode,
    );

    if (!stillAvailable) {
      setSelectedSlot(null);
    }
  }, [availableSlots, isLoading, selectedSlot]);

  const parkingCost = durationHours * HOURLY_RATE;
  const hasEnoughBalance = walletBalance >= parkingCost;
  const hasRouteSlotSelection = Boolean(selectedFloorId && selectedSlotCode);
  const selectedRouteSlotUnavailable =
    hasRouteSlotSelection && !selectedSlot && !isLoading && availableSlots.length > 0;
  const canBook = Boolean(selectedSlot && selectedVehicleId && hasEnoughBalance && !submitting);

  const groupedSlots = useMemo(
    () =>
      availableSlots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
        const key = slot.floorName ?? String(slot.floorId);
        acc[key] = [...(acc[key] ?? []), slot];
        return acc;
      }, {}),
    [availableSlots],
  );

  const selectedVehicle = vehicles.find((vehicle) => (vehicle.id ?? vehicle._id ?? '') === selectedVehicleId);

  const handleSubmit = async () => {
    if (!selectedSlot || !selectedVehicleId || !hasEnoughBalance) return;

    setSubmitting(true);
    try {
      const booking = await createBooking({
        floorId: selectedSlot.floorId,
        slotCode: selectedSlot.slotCode,
        vehicleId: selectedVehicleId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        serviceIds: [],
      });

      Alert.alert('Đặt chỗ thành công', `Vị trí ${booking.slotCode} đã được giữ cho bạn.`, [
        {
          text: 'Xem chi tiết',
          onPress: () => navigation.navigate('BookingDetail', { bookingId: booking._id }),
        },
      ]);
    } catch (submitError) {
      Alert.alert(
        'Đặt chỗ thất bại',
        submitError instanceof Error ? submitError.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Đặt chỗ mới" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.timeDur}>{durationHours} giờ</Text>
              </View>
              <View style={[styles.timeBlock, styles.timeBlockRight]}>
                <Text style={styles.timeLabel}>Ra</Text>
                <Text style={styles.timeValue}>{format(endTime, 'HH:mm')}</Text>
                <Text style={styles.timeDate}>{format(endTime, 'dd/MM/yyyy')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle>Thời gian đỗ</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {DURATION_OPTIONS.map((hours) => (
                <Pressable
                  key={hours}
                  style={[styles.pill, durationHours === hours && styles.pillActive]}
                  onPress={() => setDurationHours(hours)}
                >
                  <Text style={[styles.pillText, durationHours === hours && styles.pillTextActive]}>
                    {hours}h
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

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
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionTitle>Vị trí đỗ</SectionTitle>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.mapBtn}
                onPress={() =>
                  navigation.navigate('FindParking', {
                    floorId: selectedSlot?.floorId,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                  })
                }
              >
                <Ionicons name="map-outline" size={14} color={COLORS.gold} />
                <Text style={styles.mapBtnText}>{selectedSlot ? 'Đổi vị trí' : 'Xem sơ đồ'}</Text>
              </TouchableOpacity>
            </View>

            {selectedSlot ? (
              <View style={styles.selectedSlotCard}>
                <View style={styles.selectedSlotIcon}>
                  <Ionicons name="location" size={20} color={COLORS.gold} />
                </View>
                <View style={styles.selectedSlotInfo}>
                  <Text style={styles.selectedSlotCode}>{selectedSlot.slotCode}</Text>
                  <Text style={styles.selectedSlotMeta}>
                    {selectedSlot.floorName ?? selectedFloorName ?? selectedSlot.floorId}
                    {selectedVehicle ? ` • ${selectedVehicle.licensePlate}` : ''}
                  </Text>
                </View>
              </View>
            ) : selectedRouteSlotUnavailable ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Vị trí {selectedSlotCode} không còn trống trong khung giờ này. Vui lòng chọn vị trí khác.
                </Text>
              </View>
            ) : null}

            {isLoading ? (
              <ActivityIndicator color={COLORS.gold} style={styles.loading} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => getAvailableSlots(startTime, endTime)} />
            ) : Object.keys(groupedSlots).length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="Không có chỗ trống"
                message="Hãy thử chọn thời lượng khác hoặc quay lại sau."
              />
            ) : (
              Object.entries(groupedSlots).map(([floor, slots]) => (
                <View key={floor} style={styles.floorGroup}>
                  <Text style={styles.floorLabel}>{floor}</Text>
                  <View style={styles.slotGrid}>
                    {slots.slice(0, 12).map((slot) => {
                      const active = selectedSlot?.slotCode === slot.slotCode && selectedSlot.floorId === slot.floorId;
                      return (
                        <Pressable
                          key={`${slot.floorId}-${slot.slotCode}`}
                          style={[styles.slotChip, active && styles.slotChipActive]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                            {slot.slotCode}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {slots.length > 12 ? (
                      <View style={styles.slotMore}>
                        <Text style={styles.slotMoreText}>+{slots.length - 12} chỗ</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Đơn giá</Text>
              <Text style={styles.priceValue}>{formatCurrency(HOURLY_RATE)}/giờ</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Thời gian</Text>
              <Text style={styles.priceValue}>{durationHours} giờ</Text>
            </View>
            <View style={[styles.priceRow, styles.priceTotal]}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatCurrency(parkingCost)}</Text>
            </View>
            <View style={styles.walletRow}>
              <Ionicons
                name="wallet-outline"
                size={14}
                color={hasEnoughBalance ? COLORS.success : COLORS.error}
              />
              <Text style={[styles.walletText, { color: hasEnoughBalance ? COLORS.success : COLORS.error }]}>
                Số dư ví: {formatCurrency(walletBalance)}
                {hasEnoughBalance ? '' : ' (không đủ)'}
              </Text>
            </View>
          </View>

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
    </SafeAreaView>
  );
};

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
  pillRow: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  pill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: COLORS.gold },
  pillText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  pillTextActive: { color: COLORS.gold },
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
  mapBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
  },
  mapBtnText: { color: COLORS.gold, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  selectedSlotCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.28)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  selectedSlotIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectedSlotInfo: { flex: 1 },
  selectedSlotCode: { color: COLORS.gold, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  selectedSlotMeta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: 2 },
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
  loading: { padding: SPACING.lg },
  floorGroup: { gap: SPACING.sm },
  floorLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slotChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 58,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  slotChipActive: { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: COLORS.gold },
  slotChipText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '700', textAlign: 'center' },
  slotChipTextActive: { color: COLORS.gold },
  slotMore: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  slotMoreText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
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
});
