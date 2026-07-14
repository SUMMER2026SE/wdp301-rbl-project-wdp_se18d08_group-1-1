import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { WalletStackParamList } from '@/navigation/types';
import { walletService } from '@/services/api/wallet';
import type { TransactionStatus, TransactionType, WalletTransaction } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'TransactionHistory'>;
type TypeFilter = 'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND';
type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

const TYPE_LABELS: Record<TypeFilter, string> = {
  ALL: 'Tất cả',
  TOP_UP: 'Nạp tiền',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: 'Mọi trạng thái',
  PENDING: 'Chờ xử lý',
  COMPLETED: 'Hoàn tất',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
};

const STATUS_COLORS: Record<StatusFilter, string> = {
  ALL: COLORS.gold,
  PENDING: COLORS.warning,
  COMPLETED: COLORS.success,
  FAILED: COLORS.error,
  CANCELLED: COLORS.textMuted,
};

export const TransactionHistoryScreen = ({ navigation }: Props) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const loadTransactions = useCallback(async () => {
    setError('');
    try {
      const response = await walletService.getTransactions({
        page: 1,
        limit: 20,
        type: type === 'ALL' ? undefined : type,
        status: status === 'ALL' ? undefined : status,
      });
      setTransactions(response.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải giao dịch.');
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, type]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadTransactions();
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const itemType = String(item.type as TransactionType) as TypeFilter;
    const itemStatus = String(item.status as TransactionStatus) as StatusFilter;
    const isCredit = itemType === 'TOP_UP' || itemType === 'REFUND';
    const amountColor = isCredit ? COLORS.success : COLORS.warning;
    const statusColor = STATUS_COLORS[itemStatus] ?? COLORS.textMuted;

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.transactionIcon, { backgroundColor: `${amountColor}18` }]}>
          <Ionicons name={isCredit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={22} color={amountColor} />
        </View>
        <View style={styles.transactionBody}>
          <View style={styles.transactionTop}>
            <Text style={styles.transactionTitle} numberOfLines={1}>
              {item.description || TYPE_LABELS[itemType] || itemType}
            </Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {isCredit ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{TYPE_LABELS[itemType] || itemType}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[itemStatus] || itemStatus}</Text>
            </View>
          </View>
          {item.balanceBefore !== undefined && item.balanceAfter !== undefined ? (
            <Text style={styles.balanceMeta}>
              {formatCurrency(item.balanceBefore)} {'->'} {formatCurrency(item.balanceAfter)}
            </Text>
          ) : null}
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Lịch sử ví" onBack={() => navigation.goBack()} />

      <View style={styles.filtersBlock}>
        <FlatList
          horizontal
          data={Object.keys(TYPE_LABELS) as TypeFilter[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable style={[styles.chip, type === item && styles.chipActive]} onPress={() => setType(item)}>
              <Text style={[styles.chipText, type === item && styles.chipTextActive]}>{TYPE_LABELS[item]}</Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />
        <FlatList
          horizontal
          data={Object.keys(STATUS_LABELS) as StatusFilter[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable style={[styles.chip, status === item && styles.chipActive]} onPress={() => setStatus(item)}>
              <Text style={[styles.chipText, status === item && styles.chipTextActive]}>{STATUS_LABELS[item]}</Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={transactions}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Chưa có giao dịch"
              message="Giao dịch nạp tiền, thanh toán và hoàn tiền sẽ hiển thị tại đây."
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  filtersBlock: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: SPACING.sm,
    minHeight: 36,
    paddingHorizontal: SPACING.md,
  },
  chipActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: COLORS.gold,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.gold,
  },
  stateWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  transactionIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  transactionBody: {
    flex: 1,
    gap: 5,
  },
  transactionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  transactionTitle: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  amount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
  },
  statusPill: {
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  balanceMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
});
