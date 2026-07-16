import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { staffService, type StaffSubscription } from '@/services/api/staff';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'Subscriptions'>;
const FILTERS = ['all', 'active', 'pending', 'expired', 'cancelled'] as const;

const statusTone = (status: string) => status === 'active' ? COLORS.success : status === 'pending' ? COLORS.warning : status === 'expired' ? COLORS.error : COLORS.textMuted;

export function StaffSubscriptionManagementScreen({ navigation }: Props) {
  const [items, setItems] = useState<StaffSubscription[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await staffService.getSubscriptions();
      setItems(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => items.filter((item) => {
    const needle = query.trim().toLowerCase();
    const matchesSearch = !needle || [item.user?.username, item.user?.email, ...(item.user?.vehicles ?? [])].filter(Boolean).some((value) => value?.toLowerCase().includes(needle));
    return matchesSearch && (filter === 'all' || item.status === filter);
  }), [filter, items, query]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="VIP subscriptions" subtitle={`${items.length} subscriptions`} onBack={navigation.goBack} />
      <View style={styles.search}><Ionicons name="search-outline" size={18} color={COLORS.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Customer, email, or license plate" placeholderTextColor={COLORS.textMuted} style={styles.searchInput} /></View>
      <ScrollView horizontal style={styles.filterScroll} contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {FILTERS.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text></Pressable>)}
      </ScrollView>
      {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View> : error ? <ErrorState message={error} onRetry={load} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item }) => {
            const tone = statusTone(item.status);
            return <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.customerIcon}><Ionicons name="diamond-outline" size={20} color={COLORS.gold} /></View>
                <View style={styles.customerCopy}><Text style={styles.customerName}>{item.user?.username || 'Unknown customer'}</Text><Text style={styles.customerEmail}>{item.user?.email || 'No email'}</Text></View>
                <View style={[styles.status, { borderColor: tone, backgroundColor: `${tone}18` }]}><Text style={[styles.statusText, { color: tone }]}>{item.status.toUpperCase()}</Text></View>
              </View>
              <View style={styles.packageRow}><View><Text style={styles.packageLabel}>Plan</Text><Text style={styles.packageName}>{item.ticketPackage?.name || 'Unknown plan'}</Text></View><Text style={styles.amount}>{formatCurrency(item.amount)}</Text></View>
              <View style={styles.period}><Text style={styles.periodText}>{format(new Date(item.validFrom), 'dd MMM yyyy')}</Text><Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} /><Text style={styles.periodText}>{format(new Date(item.expireAt), 'dd MMM yyyy')}</Text></View>
              <View style={styles.tags}>
                {(item.user?.vehicles ?? []).map((plate) => <View key={plate} style={styles.plateTag}><Text style={styles.plateText}>{plate}</Text></View>)}
                {(item.slots ?? []).map((slot) => <View key={`${typeof slot.floorId === 'object' ? slot.floorId?._id : slot.floorId}-${slot.slotCode}`} style={styles.slotTag}><Text style={styles.slotText}>{typeof slot.floorId === 'object' ? slot.floorId?.name || 'Floor' : 'Floor'} / {slot.slotCode}</Text></View>)}
              </View>
            </View>;
          }}
          ListEmptyComponent={<EmptyState icon="diamond-outline" title="No subscriptions found" message="Try a different search or status." />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  search: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, minHeight: 46, paddingHorizontal: SPACING.md }, searchInput: { color: COLORS.textPrimary, flex: 1, fontSize: FONT_SIZES.sm },
  filterScroll: { flexGrow: 0 }, filters: { gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.md }, filter: { borderColor: COLORS.border, borderRadius: RADIUS.round, borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: SPACING.md }, filterActive: { backgroundColor: 'rgba(226,186,75,0.1)', borderColor: COLORS.gold }, filterText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' }, filterTextActive: { color: COLORS.gold },
  list: { gap: SPACING.md, padding: SPACING.lg, paddingTop: 0, paddingBottom: SPACING.xxl }, card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACING.md, padding: SPACING.md }, cardHeader: { alignItems: 'center', flexDirection: 'row', gap: SPACING.sm }, customerIcon: { alignItems: 'center', backgroundColor: 'rgba(226,186,75,0.1)', borderRadius: RADIUS.md, height: 42, justifyContent: 'center', width: 42 }, customerCopy: { flex: 1, minWidth: 0 }, customerName: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700' }, customerEmail: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 }, status: { borderRadius: RADIUS.round, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: 4 }, statusText: { fontSize: 9, fontWeight: '800' },
  packageRow: { alignItems: 'flex-end', borderTopColor: COLORS.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACING.sm }, packageLabel: { color: COLORS.textMuted, fontSize: 10 }, packageName: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '700', marginTop: 2 }, amount: { color: COLORS.gold, fontSize: FONT_SIZES.md, fontWeight: '800' }, period: { alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', padding: SPACING.sm }, periodText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, plateTag: { backgroundColor: 'rgba(226,186,75,0.1)', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 }, plateText: { color: COLORS.gold, fontSize: 10, fontWeight: '700' }, slotTag: { backgroundColor: 'rgba(226,186,75,0.1)', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 }, slotText: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
});
