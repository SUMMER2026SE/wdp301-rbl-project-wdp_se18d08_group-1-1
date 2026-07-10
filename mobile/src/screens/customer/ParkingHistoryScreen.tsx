import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { sessionsService } from '@/services/api/sessions';
import { ErrorState } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import type { ProfileStackParamList } from '@/navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<ProfileStackParamList, 'ParkingHistory'>;

interface HistorySession {
  _id: string;
  licensePlate: string;
  parkingSlot?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  totalPrice?: number;
  source?: string;
  vehicleType?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  kiosk:       'Kiosk',
  app_booking: 'App',
  booking:     'Đặt trước',
  walk_in:     'Vãng lai',
};

// ─── Card ─────────────────────────────────────────────────────────────────────
function HistoryCard({ session }: { session: HistorySession }) {
  const checkIn  = new Date(session.checkInTime);
  const checkOut = session.checkOutTime ? new Date(session.checkOutTime) : null;
  const durationMins = checkOut
    ? Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
    : null;
  const h = durationMins !== null ? Math.floor(durationMins / 60) : null;
  const m = durationMins !== null ? durationMins % 60 : null;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={session.status === 'completed' ? [COLORS.gold, 'transparent'] : [COLORS.textMuted, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardTopLine}
      />

      <View style={styles.cardTop}>
        <View style={styles.platePill}>
          <Text style={styles.plateText}>{session.licensePlate}</Text>
        </View>
        {session.totalPrice !== undefined && (
          <Text style={styles.price}>{formatCurrency(session.totalPrice)}</Text>
        )}
      </View>

      <View style={styles.cardMid}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{session.parkingSlot ?? '—'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="log-in-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{format(checkIn, 'HH:mm dd/MM/yyyy')}</Text>
        </View>
      </View>

      <View style={styles.cardBot}>
        <View style={styles.infoItem}>
          <Ionicons name="log-out-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            {checkOut ? format(checkOut, 'HH:mm dd/MM/yyyy') : 'Chưa ra'}
          </Text>
        </View>
        <View style={styles.rightRow}>
          {durationMins !== null && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {h! > 0 ? `${h}g ` : ''}{m}ph
              </Text>
            </View>
          )}
          {session.source && (
            <Text style={styles.sourceText}>{SOURCE_LABELS[session.source] ?? session.source}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export const ParkingHistoryScreen = ({ navigation }: Props) => {
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await sessionsService.getMyHistory();
      const data = (res as { data?: HistorySession[] }).data;
      setHistory(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử đỗ xe.');
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalSpent = history.reduce((sum, s) => sum + (s.totalPrice ?? 0), 0);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử đỗ xe</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Summary */}
      {history.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{history.length}</Text>
            <Text style={styles.summaryLabel}>Lần đỗ</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: COLORS.gold }]}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.summaryLabel}>Tổng chi</Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          renderItem={({ item }) => <HistoryCard session={item} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="car-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Chưa có lịch sử đỗ xe</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },

  summaryRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
    padding: SPACING.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  summaryLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', gap: SPACING.sm,
  },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platePill: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  plateText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 1 },
  price: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.gold },
  cardMid: { flexDirection: 'row', gap: SPACING.lg },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  durationBadge: {
    backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  durationText: { fontSize: FONT_SIZES.xs, color: COLORS.gold, fontWeight: '600' },
  sourceText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  emptyWrap: { paddingTop: 80, alignItems: 'center', gap: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
});
