import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { sessionsService } from '@/services/api/sessions';
import { parkingFloorService } from '@/services/ParkingFloorService';
import type { ParkingFloor } from '@/types/booking.types';

interface ActiveSession {
  _id: string;
  licensePlate: string;
  parkingSlot?: string;
  floorId?: string;
  checkInTime: string;
  status: string;
  phone?: string;
  vehicleType?: string;
  source?: string;
}

const getFloorId = (floor: ParkingFloor) => floor._id ?? floor.id ?? String(floor.floorNumber);

export default function LiveGridScreen() {
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<ParkingFloor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [floorsData, sessionsRes] = await Promise.all([
        parkingFloorService.getParkingFloors(),
        sessionsService.getActiveParkingStatus(),
      ]);
      setFloors(floorsData);
      setSessions((sessionsRes as { data?: ActiveSession[] }).data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the parking grid.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      setSelectedFloor(floors[0]);
    }
  }, [floors, selectedFloor]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const selectedFloorId = selectedFloor ? getFloorId(selectedFloor) : '';
  const activeSessions = useMemo(() => sessions.filter((session) => !session.status || session.status.toLowerCase() === 'active'), [sessions]);
  const floorSessions = useMemo(
    () => activeSessions.filter((session) => !selectedFloorId || session.floorId === selectedFloorId),
    [activeSessions, selectedFloorId],
  );
  const totalActive = activeSessions.length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Parking grid</Text>
          <Text style={styles.subtitle}>Real-time monitoring</Text>
        </View>
        <View style={styles.statChip}>
          <View style={styles.onlineDot} />
          <Text style={styles.statChipText}>{totalActive} parked vehicles</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.floorTabs}
        style={styles.floorTabScroll}
      >
        {floors.map((floor) => {
          const floorId = getFloorId(floor);
          const active = selectedFloorId === floorId;
          const count = activeSessions.filter((session) => session.floorId === floorId).length;

          return (
            <Pressable
              key={floorId}
              style={[styles.floorTab, active && styles.floorTabActive]}
              onPress={() => setSelectedFloor(floor)}
            >
              <Text style={[styles.floorTabText, active && styles.floorTabTextActive]}>{floor.name}</Text>
              {count > 0 ? (
                <View style={styles.floorBadge}>
                  <Text style={styles.floorBadgeText}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.gold} size="large" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : floorSessions.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="This floor is clear"
            message="No vehicles are currently parked here."
            accentColor={COLORS.success}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Parked vehicles - {selectedFloor?.name}</Text>
            <View style={styles.sessionGrid}>
              {floorSessions.map((session) => (
                <SessionSlotCard key={session._id} session={session} />
              ))}
            </View>
          </>
        )}

        {!loading && !error ? (
          <>
            <Text style={styles.sectionTitle}>All floors overview</Text>
            <View style={styles.summaryList}>
              {floors.map((floor) => {
                const floorId = getFloorId(floor);
                const count = activeSessions.filter((session) => session.floorId === floorId).length;
                const capacity = floor.slots?.length ?? floor.layout?.elements?.filter((element) => element.type === 'slot').length ?? floor.layoutData?.elements?.filter((element: { type?: string }) => element.type === 'slot').length ?? 0;

                return (
                  <TouchableOpacity
                    key={floorId}
                    activeOpacity={0.75}
                    style={styles.summaryRow}
                    onPress={() => setSelectedFloor(floor)}
                  >
                    <Text style={styles.summaryFloor}>{floor.name}</Text>
                    <Text style={styles.summaryStatus}>{count === 0 ? 'Clear' : count >= capacity && capacity > 0 ? 'Full' : 'In use'}</Text>
                    <Text style={styles.summaryCount}>{count} / {capacity}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionSlotCard({ session }: { session: ActiveSession }) {
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.checkInTime).getTime()) / 60000));
  const hours = Math.floor(elapsed / 60);
  const mins = elapsed % 60;

  return (
    <View style={styles.slotCard}>
      <View style={styles.slotCardTopLine} />
      <View style={styles.slotCardHeader}>
        <Text style={styles.slotCardCode}>{session.parkingSlot ?? '---'}</Text>
        <View style={styles.activeDot} />
      </View>
      <Text style={styles.slotCardPlate}>{session.licensePlate}</Text>
      <Text style={styles.slotCardTime}>{hours > 0 ? `${hours}h ` : ''}{mins}m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xxl, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 2 },
  statChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(126,232,162,0.12)',
    borderColor: 'rgba(126,232,162,0.3)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  onlineDot: { backgroundColor: COLORS.success, borderRadius: 3, height: 6, width: 6 },
  statChipText: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: '600' },
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
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  floorTabActive: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: COLORS.gold },
  floorTabText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  floorTabTextActive: { color: COLORS.gold },
  floorBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 3,
  },
  floorBadgeText: { color: COLORS.background, fontSize: 10, fontWeight: '700' },
  loadingWrap: { alignItems: 'center', gap: SPACING.md, paddingTop: 80 },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    textTransform: 'uppercase',
  },
  sessionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingHorizontal: SPACING.md },
  slotCard: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
    overflow: 'hidden',
    padding: SPACING.md,
    width: '47%',
  },
  slotCardTopLine: { backgroundColor: COLORS.gold, height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  slotCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  slotCardCode: { color: COLORS.gold, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  activeDot: { backgroundColor: COLORS.success, borderRadius: 4, height: 8, width: 8 },
  slotCardPlate: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  slotCardTime: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  summaryList: { gap: SPACING.sm, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  summaryFloor: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, width: 60 },
  summaryStatus: { color: COLORS.textMuted, flex: 1, fontSize: FONT_SIZES.xs, textAlign: 'right' },
  summaryCount: { color: COLORS.gold, fontSize: FONT_SIZES.xs, fontWeight: '700', textAlign: 'right', width: 48 },
});
