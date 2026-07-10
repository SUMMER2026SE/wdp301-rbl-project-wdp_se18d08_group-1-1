import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import type { AvailableSlot, ParkingFloor } from '@/types/booking.types';

type Props = NativeStackScreenProps<BookingStackParamList, 'FindParking'>;

const SLOT_STATUS_COLOR: Record<string, string> = {
  available: '#7EE8A2',
  occupied: '#FF6B6B',
  booked: COLORS.staffBlue,
  reserved: COLORS.staffBlue,
  maintenance: '#A0A0A0',
};

const getFloorId = (floor: ParkingFloor) => floor._id ?? floor.id ?? String(floor.floorNumber);

export const FindParkingScreen = ({ navigation, route }: Props) => {
  const { availableSlots, parkingFloors, isLoading, error, fetchParkingFloors, getAvailableSlots } = useBooking();
  const [selectedFloor, setSelectedFloor] = useState<ParkingFloor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const startTime = useMemo(
    () => (route.params?.startTime ? new Date(route.params.startTime) : new Date()),
    [route.params?.startTime],
  );
  const endTime = useMemo(
    () => (route.params?.endTime ? new Date(route.params.endTime) : new Date(Date.now() + 2 * 3600_000)),
    [route.params?.endTime],
  );

  useEffect(() => {
    void fetchParkingFloors();
    void getAvailableSlots(startTime, endTime);
  }, [endTime, fetchParkingFloors, getAvailableSlots, startTime]);

  useEffect(() => {
    if (parkingFloors.length === 0 || selectedFloor) return;

    const preferredFloor = route.params?.floorId
      ? parkingFloors.find((floor) => getFloorId(floor) === route.params?.floorId)
      : undefined;
    setSelectedFloor(preferredFloor ?? parkingFloors[0]);
  }, [parkingFloors, route.params?.floorId, selectedFloor]);

  const selectedFloorId = selectedFloor ? getFloorId(selectedFloor) : '';
  const floorSlots = useMemo(
    () => availableSlots.filter((slot) => slot.floorId === selectedFloorId),
    [availableSlots, selectedFloorId],
  );
  const totalAvailable = availableSlots.length;
  const mapRows = Math.max(6, Math.ceil(Math.max(floorSlots.length, 1) / 5));
  const mapHeight = 16 + mapRows * 68 + 16;

  const handleConfirmSlot = () => {
    if (!selectedSlot) return;

    navigation.navigate('CreateBooking', {
      selectedFloorId: selectedSlot.floorId,
      selectedFloorName: selectedFloor?.name ?? selectedSlot.floorName,
      selectedSlotCode: selectedSlot.slotCode,
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Sơ đồ bãi xe" onBack={() => navigation.goBack()} />

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#7EE8A2' }]} />
          <Text style={styles.statText}>Trống ({totalAvailable})</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: COLORS.staffBlue }]} />
          <Text style={styles.statText}>Đã đặt</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#A0A0A0' }]} />
          <Text style={styles.statText}>Bảo trì</Text>
        </View>
      </View>

      {parkingFloors.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorTabs}
          style={styles.floorTabScroll}
        >
          {parkingFloors.map((floor) => {
            const floorId = getFloorId(floor);
            const active = selectedFloorId === floorId;
            const floorCount = availableSlots.filter((slot) => slot.floorId === floorId).length;
            return (
              <Pressable
                key={floorId}
                style={[styles.floorTab, active && styles.floorTabActive]}
                onPress={() => {
                  setSelectedFloor(floor);
                  setSelectedSlot(null);
                }}
              >
                <Text style={[styles.floorTabText, active && styles.floorTabTextActive]}>{floor.name}</Text>
                <View style={[styles.floorCount, active && styles.floorCountActive]}>
                  <Text style={[styles.floorCountText, active && styles.floorCountTextActive]}>
                    {floorCount}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView style={styles.mapScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.mapCanvas, { minHeight: mapHeight }]}>
            {isLoading ? (
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
                <EmptyState
                  icon="layers-outline"
                  title="Chưa có tầng"
                  message="Không tìm thấy tầng bãi xe để hiển thị."
                />
              </View>
            ) : floorSlots.length === 0 ? (
              <View style={styles.mapState}>
                <EmptyState
                  icon="car-outline"
                  title="Không có chỗ trống"
                  message="Tầng này không còn vị trí phù hợp với khung giờ đã chọn."
                />
              </View>
            ) : (
              floorSlots.map((slot, index) => {
                const col = index % 5;
                const row = Math.floor(index / 5);
                const isSelected = selectedSlot?.slotCode === slot.slotCode && selectedSlot.floorId === slot.floorId;
                const color = isSelected
                  ? COLORS.gold
                  : SLOT_STATUS_COLOR[slot.status ?? 'available'] ?? COLORS.textMuted;

                return (
                  <Pressable
                    key={`${slot.floorId}-${slot.slotCode}`}
                    style={[
                      styles.slotBox,
                      {
                        backgroundColor: isSelected ? 'rgba(212,175,55,0.2)' : `${color}18`,
                        borderColor: color,
                        left: 16 + col * 72,
                        top: 16 + row * 68,
                      },
                    ]}
                    onPress={() => setSelectedSlot(isSelected ? null : slot)}
                  >
                    <Ionicons
                      name={slot.status === 'occupied' ? 'car' : 'car-outline'}
                      size={20}
                      color={color}
                    />
                    <Text style={[styles.slotBoxText, { color }]}>{slot.slotCode}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {selectedSlot ? (
        <View style={styles.selectedPanel}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedSlotCode}>{selectedSlot.slotCode}</Text>
            <Text style={styles.selectedFloor}>
              {selectedFloor?.name ?? selectedSlot.floorName ?? selectedSlot.floorId}
              {selectedSlot.zoneName ? ` - ${selectedSlot.zoneName}` : ''}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.selectBtn} onPress={handleConfirmSlot}>
            <Text style={styles.selectBtnText}>Chọn vị trí này</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  statItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  statDot: { borderRadius: 5, height: 10, width: 10 },
  statText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  floorTabScroll: { maxHeight: 44 },
  floorTabs: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
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
  mapScroll: { flex: 1 },
  mapCanvas: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    margin: SPACING.md,
    minHeight: 420,
    position: 'relative',
    width: 16 + 5 * 72 + 16,
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
  },
  mapStateText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, marginTop: SPACING.md },
  slotBox: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    gap: 2,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    width: 62,
  },
  slotBoxText: { fontSize: 10, fontWeight: '700' },
  selectedPanel: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: SPACING.md,
    padding: SPACING.md,
  },
  selectedInfo: { flex: 1 },
  selectedSlotCode: { color: COLORS.gold, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  selectedFloor: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: 2 },
  selectBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.md,
  },
  selectBtnText: { color: COLORS.textInverse, fontSize: FONT_SIZES.sm, fontWeight: '700' },
});
