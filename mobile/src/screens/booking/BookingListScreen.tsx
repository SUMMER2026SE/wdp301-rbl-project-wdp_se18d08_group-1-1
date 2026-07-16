import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/BookingStackNavigator';
import type { CustomerTabParamList } from '@/navigation/CustomerNavigator';
import type { Booking, BookingStatus, ParkingFloor } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingList'>;
type FilterType = BookingStatus | 'all';

const STATUS_CONFIG: Record<BookingStatus | 'all', { label: string; color: string; bg: string }> = {
  all: { label: 'All', color: COLORS.textSecondary, bg: COLORS.surface },
  pending: { label: 'Payment pending', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
  confirmed: { label: 'Confirmed', color: COLORS.staffBlue, bg: 'rgba(96,180,255,0.12)' },
  active: { label: 'Parked', color: COLORS.success, bg: 'rgba(76,175,80,0.12)' },
  paused: { label: 'Paused', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
  completed: { label: 'Completed', color: COLORS.textMuted, bg: COLORS.surfaceElevated },
  cancelled: { label: 'Cancelled', color: COLORS.error, bg: 'rgba(255,77,77,0.12)' },
  expired: { label: 'Expired', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
};

const FILTERS: FilterType[] = ['all', 'pending', 'confirmed', 'active', 'paused', 'completed', 'cancelled', 'expired'];

function getStatusConfig(status: BookingStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.all;
}

function safeFormat(dateStr: string | undefined | null, fmt: string) {
  try {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, fmt);
  } catch {
    return 'N/A';
  }
}

function getFloorLabel(floorId: Booking['floorId']) {
  if (typeof floorId === 'string') return 'VALO Parking';
  const floor = floorId as ParkingFloor;
  return floor.name || `Floor ${floor.floorNumber}`;
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const statusConfig = getStatusConfig(booking.status);
  const startDate = safeFormat(booking.startTime, 'dd/MM/yyyy');
  const startTime = safeFormat(booking.startTime, 'HH:mm');
  const endTime = safeFormat(booking.endTime, 'HH:mm');

  return (
    <Pressable
      accessibilityLabel={`Space ${booking.slotCode}, ${statusConfig.label}, ${startDate} from ${startTime} to ${endTime}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.cardAccent, { backgroundColor: statusConfig.color }]} />

      <View style={styles.cardHeader}>
        <View style={styles.slotIdentity}>
          <View style={[styles.slotIcon, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name="location" size={18} color={statusConfig.color} />
          </View>
          <View style={styles.slotCopy}>
            <Text style={styles.slotCode}>Space {booking.slotCode}</Text>
            <Text style={styles.floorLabel} numberOfLines={1}>{getFloorLabel(booking.floorId)}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.scheduleRow}>
        <View style={styles.dateBlock}>
          <Ionicons name="calendar-clear-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.dateText}>{startDate}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{startTime}</Text>
          <View style={styles.timeLine} />
          <Text style={styles.timeText}>{endTime}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.platePill}>
          <Ionicons name="car-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.plateText}>{booking.licensePlate}</Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>{formatCurrency(booking.finalAmount ?? booking.prepaidAmount ?? 0)}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

export const BookingListScreen = ({ navigation }: Props) => {
  const { bookings, isLoading, error, fetchBookings } = useBooking();
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const filtered = filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter);

  const countFor = useCallback(
    (filterType: FilterType) =>
      filterType === 'all' ? bookings.length : bookings.filter((booking) => booking.status === filterType).length,
    [bookings],
  );

  const openCreateBooking = useCallback(() => {
    const tabNavigation = navigation.getParent<BottomTabNavigationProp<CustomerTabParamList>>();

    if (tabNavigation) {
      tabNavigation.navigate('Bookings', { screen: 'CreateBooking' });
      return;
    }

    navigation.navigate('CreateBooking');
  }, [navigation]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>My bookings</Text>
          <Text style={styles.headerSubtitle}>
            {bookings.length > 0 ? `${bookings.length} parking reservations` : 'Manage your parking reservations'}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Create a new booking"
          accessibilityRole="button"
          activeOpacity={0.8}
          style={styles.newBtn}
          onPress={openCreateBooking}
        >
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.gold]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.newBtnGrad}
          >
            <Ionicons name="add" size={18} color={COLORS.textInverse} />
            <Text style={styles.newBtnText}>New booking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersWrap}
        style={styles.filterScroll}
      >
        {FILTERS.map((filterType) => {
          const config = STATUS_CONFIG[filterType];
          const active = filter === filterType;
          return (
            <Pressable
              key={filterType}
              style={[
                styles.filterPill,
                active
                  ? { backgroundColor: config.bg, borderColor: config.color }
                  : { backgroundColor: COLORS.surface, borderColor: COLORS.border },
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[styles.filterText, { color: active ? config.color : COLORS.textMuted }]}>
                {config.label}
              </Text>
              <View style={[styles.filterBadge, { backgroundColor: active ? config.color : COLORS.border }]}>
                <Text style={[styles.filterBadgeText, { color: active ? COLORS.background : COLORS.textMuted }]}>
                  {countFor(filterType)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <ErrorState message={error} onRetry={fetchBookings} />
      ) : isLoading && bookings.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
              onRefresh={fetchBookings}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
            />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="calendar-outline"
                title={filter === 'all' ? 'No bookings yet' : `No ${STATUS_CONFIG[filter].label.toLowerCase()} bookings`}
                message="Create a booking to reserve your space before arrival."
                actionLabel="New booking"
                onAction={openCreateBooking}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: SPACING.md },
  headerTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 4 },
  newBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  newBtnGrad: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: SPACING.md,
  },
  newBtnText: { color: COLORS.textInverse, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  filterScroll: { flexGrow: 0, maxHeight: 48 },
  filtersWrap: { alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: 4 },
  filterPill: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  filterText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  filterBadge: {
    alignItems: 'center',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },
  listContent: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: 112 },
  loadingState: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, marginTop: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: SPACING.md,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cardAccent: { bottom: SPACING.lg, left: 0, position: 'absolute', top: SPACING.lg, width: 3 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  slotIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACING.sm, minWidth: 0 },
  slotIcon: { alignItems: 'center', borderRadius: RADIUS.md, height: 42, justifyContent: 'center', width: 42 },
  slotCopy: { flex: 1, minWidth: 0 },
  slotCode: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '800' },
  floorLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  statusPill: { borderRadius: RADIUS.round, borderWidth: 1, marginLeft: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: '700' },
  scheduleRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  dateBlock: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dateText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  timeBlock: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  timeText: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  timeLine: { backgroundColor: COLORS.borderLight, height: 1, width: 18 },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
  },
  platePill: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  plateText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 0.7 },
  amountWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  amountLabel: { color: COLORS.textMuted, fontSize: 10 },
  amount: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '800' },
});
