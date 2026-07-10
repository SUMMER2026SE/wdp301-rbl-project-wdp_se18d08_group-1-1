import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
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
import type { Booking, BookingStatus } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingList'>;
type FilterType = BookingStatus | 'all';

const STATUS_CONFIG: Record<BookingStatus | 'all', { label: string; color: string; bg: string }> = {
  all: { label: 'Tất cả', color: COLORS.textSecondary, bg: COLORS.surface },
  confirmed: { label: 'Đã xác nhận', color: COLORS.staffBlue, bg: 'rgba(96,180,255,0.12)' },
  active: { label: 'Đang đỗ', color: COLORS.success, bg: 'rgba(76,175,80,0.12)' },
  completed: { label: 'Hoàn thành', color: COLORS.textMuted, bg: COLORS.surfaceElevated },
  cancelled: { label: 'Đã hủy', color: COLORS.error, bg: 'rgba(255,77,77,0.12)' },
  expired: { label: 'Hết hạn', color: COLORS.warning, bg: 'rgba(255,159,67,0.12)' },
};

const FILTERS: FilterType[] = ['all', 'confirmed', 'active', 'completed', 'cancelled', 'expired'];

function getStatusConfig(status: BookingStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.all;
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const statusConfig = getStatusConfig(booking.status);
  const startDate = format(new Date(booking.startTime), 'dd/MM/yyyy HH:mm');
  const endTime = format(new Date(booking.endTime), 'HH:mm');

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {booking.status === 'active' || booking.status === 'confirmed' ? (
        <LinearGradient
          colors={booking.status === 'active' ? [COLORS.success, 'transparent'] : [COLORS.gold, 'transparent']}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.cardTopLine}
        />
      ) : null}

      <View style={styles.cardRow}>
        <View style={styles.slotWrap}>
          <Ionicons name="location" size={14} color={COLORS.gold} />
          <Text style={styles.slotCode}>{booking.slotCode}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
        <Text style={styles.cardMeta}>
          {startDate} - {endTime}
        </Text>
      </View>

      <View style={[styles.cardRow, styles.bottomRow]}>
        <View style={styles.platePill}>
          <Text style={styles.plateText}>{booking.licensePlate}</Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(booking.finalAmount ?? booking.prepaidAmount ?? 0)}</Text>
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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đặt chỗ của tôi</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.newBtn}
          onPress={() => navigation.navigate('CreateBooking')}
        >
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.gold]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.newBtnGrad}
          >
            <Ionicons name="add" size={16} color={COLORS.textInverse} />
            <Text style={styles.newBtnText}>Đặt mới</Text>
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
                title={filter === 'all' ? 'Chưa có đặt chỗ' : `Không có mục "${STATUS_CONFIG[filter].label}"`}
                message="Bấm Đặt mới để giữ vị trí trước khi đến bãi."
                actionLabel="Đặt mới"
                onAction={() => navigation.navigate('CreateBooking')}
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xxl, fontWeight: '700' },
  newBtn: { borderRadius: RADIUS.round, overflow: 'hidden' },
  newBtnGrad: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: SPACING.md,
  },
  newBtnText: { color: COLORS.textInverse, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  filterScroll: { maxHeight: 44 },
  filtersWrap: { alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  filterPill: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
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
  listContent: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  pressed: { opacity: 0.85 },
  cardTopLine: { height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  cardRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  slotWrap: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  slotCode: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' },
  statusPill: { borderRadius: RADIUS.round, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  cardMeta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  bottomRow: { marginTop: SPACING.xs },
  platePill: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  plateText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600', letterSpacing: 1 },
  amount: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '700' },
});
