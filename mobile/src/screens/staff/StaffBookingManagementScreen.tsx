import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { staffService, type StaffBooking } from '@/services/api/staff';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'Bookings'>;
type BookingFilter = 'ALL' | 'UPCOMING' | 'ACTIVE' | 'HISTORY';

const FILTERS: BookingFilter[] = ['ALL', 'UPCOMING', 'ACTIVE', 'HISTORY'];
const statusColor = (status: string) => {
  if (status === 'ACTIVE') return COLORS.success;
  if (status === 'PAID') return COLORS.success;
  if (status === 'CANCELLED' || status === 'EXPIRED') return COLORS.error;
  if (status === 'COMPLETED') return COLORS.textMuted;
  return COLORS.warning;
};

export function StaffBookingManagementScreen({ navigation }: Props) {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [filter, setFilter] = useState<BookingFilter>('ALL');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StaffBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await staffService.getBookings({ date: format(date, 'yyyy-MM-dd') });
      setBookings(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const filtered = useMemo(() => bookings.filter((booking) => {
    const status = booking.status.toUpperCase();
    const groupMatches = filter === 'ALL'
      || (filter === 'UPCOMING' && ['PENDING', 'PAID'].includes(status))
      || (filter === 'ACTIVE' && ['ACTIVE', 'PAUSED'].includes(status))
      || (filter === 'HISTORY' && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status));
    const needle = query.trim().toLowerCase();
    const userName = booking.userId?.fullName ?? '';
    return groupMatches && (!needle || [booking.licensePlate, booking.parkingSlot, userName].some((value) => value.toLowerCase().includes(needle)));
  }), [bookings, filter, query]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Booking management" subtitle={`${bookings.length} on selected day`} onBack={navigation.goBack} />

      <View style={styles.dateBar}>
        <TouchableOpacity onPress={() => setDate((current) => subDays(current, 1))} style={styles.dateButton}><Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(new Date())} style={styles.dateCopy}>
          <Text style={styles.dateTitle}>{format(date, 'EEEE')}</Text>
          <Text style={styles.dateValue}>{format(date, 'dd MMM yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate((current) => addDays(current, 1))} style={styles.dateButton}><Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Plate, space, or customer" placeholderTextColor={COLORS.textMuted} style={styles.searchInput} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterScroll}>
        {FILTERS.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item.charAt(0) + item.slice(1).toLowerCase()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View> : error ? <ErrorState message={error} onRetry={load} /> : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item }) => {
            const color = statusColor(item.status);
            const floor = typeof item.floorId === 'string' ? 'Floor' : item.floorId?.name || `Floor ${item.floorId?.floorNumber ?? ''}`;
            return (
              <Pressable onPress={() => setSelected(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={[styles.accent, { backgroundColor: color }]} />
                <View style={styles.cardHeader}>
                  <View><Text style={styles.plate}>{item.licensePlate}</Text><Text style={styles.customer}>{item.userId?.fullName || item.userId?.email || 'Guest'}</Text></View>
                  <View style={[styles.status, { backgroundColor: `${color}18`, borderColor: color }]}><Text style={[styles.statusText, { color }]}>{item.status}</Text></View>
                </View>
                <View style={styles.routeRow}>
                  <View style={styles.routeItem}><Ionicons name="location-outline" size={15} color={COLORS.gold} /><Text style={styles.routeText}>{floor} / {item.parkingSlot}</Text></View>
                  <View style={styles.routeItem}><Ionicons name="time-outline" size={15} color={COLORS.textMuted} /><Text style={styles.routeText}>{format(new Date(item.scheduledStart), 'HH:mm')} - {format(new Date(item.scheduledEnd), 'HH:mm')}</Text></View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No bookings found" message="Try another date or filter." />}
        />
      )}

      <Modal animationType="slide" transparent visible={Boolean(selected)} onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{selected?.licensePlate}</Text><Text style={styles.sheetSub}>Booking details</Text></View><TouchableOpacity onPress={() => setSelected(null)} style={styles.close}><Ionicons name="close" size={22} color={COLORS.textSecondary} /></TouchableOpacity></View>
          <Detail label="Customer" value={selected?.userId?.fullName || selected?.userId?.email || 'Guest'} />
          <Detail label="Parking space" value={`${typeof selected?.floorId === 'object' ? selected.floorId?.name || 'Floor' : 'Floor'} / ${selected?.parkingSlot || '--'}`} />
          <Detail label="Schedule" value={selected ? `${format(new Date(selected.scheduledStart), 'dd MMM, HH:mm')} - ${format(new Date(selected.scheduledEnd), 'dd MMM, HH:mm')}` : '--'} />
          <Detail label="Payment" value={`${selected?.paymentMethod || 'Wallet'} / ${formatCurrency(selected?.prepaidAmount ?? 0)}`} />
          <Detail label="Status" value={selected?.status || '--'} />
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  dateBar: { alignItems: 'center', flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: SPACING.xs },
  dateButton: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.md, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  dateCopy: { alignItems: 'center', flex: 1 }, dateTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' }, dateValue: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  searchWrap: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.md, minHeight: 46, paddingHorizontal: SPACING.md }, searchInput: { color: COLORS.textPrimary, flex: 1, fontSize: FONT_SIZES.sm },
  filterScroll: { flexGrow: 0 }, filters: { gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }, filter: { borderColor: COLORS.border, borderRadius: RADIUS.round, borderWidth: 1, minHeight: 36, paddingHorizontal: SPACING.md, justifyContent: 'center' }, filterActive: { backgroundColor: 'rgba(226,186,75,0.1)', borderColor: COLORS.gold }, filterText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' }, filterTextActive: { color: COLORS.gold },
  list: { gap: SPACING.sm, padding: SPACING.lg, paddingTop: 0, paddingBottom: SPACING.xxl }, card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACING.md, overflow: 'hidden', padding: SPACING.md }, pressed: { backgroundColor: COLORS.surfaceElevated, transform: [{ scale: 0.99 }] }, accent: { bottom: SPACING.md, left: 0, position: 'absolute', top: SPACING.md, width: 3 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, plate: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '800', letterSpacing: 0.8 }, customer: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 3 }, status: { borderRadius: RADIUS.round, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: 4 }, statusText: { fontSize: 9, fontWeight: '800' }, routeRow: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, gap: 7, padding: SPACING.sm }, routeItem: { alignItems: 'center', flexDirection: 'row', gap: 6 }, routeText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  overlay: { backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl }, sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }, sheetTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, fontWeight: '800', letterSpacing: 0.8 }, sheetSub: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 }, close: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, detail: { borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4, paddingVertical: SPACING.sm }, detailLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs }, detailValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
