import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { staffService, type StaffSession } from '@/services/api/staff';

export type StaffSessionStackParamList = {
  SessionList: undefined;
  SessionDetail: { session: ActiveSession };
};

export type ActiveSession = StaffSession;

type Props = NativeStackScreenProps<StaffSessionStackParamList, 'SessionList'>;
type FilterType = 'active' | 'completed' | 'all';

const SOURCE_LABELS: Record<string, string> = {
  kiosk: 'Kiosk',
  app_booking: 'App',
  booking: 'Booked',
  walk_in: 'Walk-in',
};

function SessionCard({ session, onPress }: { session: ActiveSession; onPress: () => void }) {
  const elapsed = session.status === 'active'
    ? Math.max(0, Math.floor((Date.now() - new Date(session.checkInTime).getTime()) / 60000))
    : undefined;
  const hours = elapsed !== undefined ? Math.floor(elapsed / 60) : 0;
  const mins = elapsed !== undefined ? elapsed % 60 : 0;
  const isActive = session.status === 'active';

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {isActive ? (
        <LinearGradient
          colors={[COLORS.gold, 'transparent']}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.cardTopLine}
        />
      ) : null}

      <View style={styles.cardRow}>
        <View style={styles.platePill}>
          <Text style={styles.plateText}>{session.licensePlate}</Text>
        </View>
        <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillDone]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.textMuted }]} />
          <Text style={[styles.statusText, { color: isActive ? COLORS.success : COLORS.textMuted }]}>
            {isActive ? 'Active' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={[styles.cardRow, styles.metaRow]}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{session.parkingSlot ?? 'Not assigned'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{session.phone || 'No phone'}</Text>
        </View>
      </View>

      <View style={styles.timelineRow}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>Check in</Text>
          <Text style={styles.timelineValue}>
            {format(new Date(session.checkInTime), 'HH:mm dd/MM')}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={COLORS.borderLight} />
        <View style={[styles.timelineItem, styles.timelineItemRight]}>
          <Text style={styles.timelineLabel}>Check out</Text>
          <Text style={styles.timelineValue}>
            {session.checkOutTime
              ? format(new Date(session.checkOutTime), 'HH:mm dd/MM')
              : 'In progress'}
          </Text>
        </View>
      </View>

      <View style={[styles.cardRow, styles.footerRow]}>
        {elapsed !== undefined ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{hours > 0 ? `${hours}g ` : ''}{mins}ph</Text>
          </View>
        ) : null}
        {session.source ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{SOURCE_LABELS[session.source] ?? session.source}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

export const SessionListScreen = ({ navigation }: Props) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await staffService.getSessions();
      setSessions(res.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load parking sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = filter === 'all' ? sessions : sessions.filter((session) => session.status === filter);
  const activeCount = sessions.filter((session) => session.status === 'active').length;
  const completedCount = sessions.filter((session) => session.status === 'completed').length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <Text style={styles.title}>Parking sessions</Text>
        <View style={styles.headerBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.headerBadgeText}>{activeCount} active</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: 'rgba(126,232,162,0.2)' }]}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(160,160,160,0.2)' }]}>
          <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(212,175,55,0.2)' }]}>
          <Text style={[styles.statValue, { color: COLORS.gold }]}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['active', 'completed', 'all'] as FilterType[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.filterTab, filter === item && styles.filterTabActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item === 'active' ? 'Active' : item === 'completed' ? 'Completed' : 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
              onRefresh={onRefresh}
            />
          }
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => navigation.navigate('SessionDetail', { session: item })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="No sessions found"
              message="No sessions match the current filter."
              accentColor={COLORS.gold}
            />
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
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xxl, fontWeight: '700' },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(126,232,162,0.1)',
    borderColor: 'rgba(126,232,162,0.2)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  onlineDot: { backgroundColor: COLORS.success, borderRadius: 3, height: 6, width: 6 },
  headerBadgeText: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  statCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    padding: SPACING.md,
  },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  filterTab: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  filterTabActive: { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: COLORS.gold },
  filterText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  filterTextActive: { color: COLORS.gold },
  loadingWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  listContent: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  pressed: { opacity: 0.85 },
  cardTopLine: { height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  cardRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  platePill: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  plateText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusPillActive: { backgroundColor: 'rgba(126,232,162,0.12)' },
  statusPillDone: { backgroundColor: COLORS.surfaceElevated },
  statusDot: { borderRadius: 3, height: 6, width: 6 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  metaRow: { marginTop: SPACING.sm },
  infoItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  infoText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },
  timelineRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },
  timelineItem: { flex: 1 },
  timelineItemRight: { alignItems: 'flex-end' },
  timelineLabel: { color: COLORS.textMuted, fontSize: 9, textTransform: 'uppercase' },
  timelineValue: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    marginTop: 2,
  },
  footerRow: { marginTop: SPACING.xs },
  durationBadge: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  durationText: { color: COLORS.gold, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  sourceBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  sourceText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  chevron: { marginLeft: 'auto' },
});
