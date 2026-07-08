import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { walletService } from '@/services/api/wallet';
import { borderRadius, colors, spacing } from '@/theme';
import type { TransactionStatus, TransactionType, WalletTransaction } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND'>('ALL');
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('ALL');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await walletService.getTransactions({
        page: 1,
        limit: 10,
        type: type === 'ALL' ? undefined : type,
        status: status === 'ALL' ? undefined : status,
      });
      setTransactions(response.data || []);
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  return (
    <Screen>
      <AppText variant="h1">Transactions</AppText>
      <View style={styles.filters}>
        {(['ALL', 'TOP_UP', 'PAYMENT', 'REFUND'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.chip, type === option && styles.activeChip]}
            onPress={() => setType(option)}
          >
            <AppText color={type === option ? colors.neutral.white : colors.light.text.primary} variant="caption">
              {option}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        {(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.chip, status === option && styles.activeChip]}
            onPress={() => setStatus(option)}
          >
            <AppText color={status === option ? colors.neutral.white : colors.light.text.primary} variant="caption">
              {option}
            </AppText>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }}>
              <AppText variant="h3">{formatCurrency(item.amount)}</AppText>
              <AppText>{item.description}</AppText>
              <AppText>{String(item.type as TransactionType)} - {String(item.status as TransactionStatus)}</AppText>
              {item.balanceBefore !== undefined && item.balanceAfter !== undefined ? (
                <AppText variant="caption">
                  Balance: {formatCurrency(item.balanceBefore)} to {formatCurrency(item.balanceAfter)}
                </AppText>
              ) : null}
              {item.payosOrderCode ? <AppText variant="caption">PayOS: {item.payosOrderCode}</AppText> : null}
              <AppText variant="caption">{formatDate(item.createdAt)}</AppText>
            </Card>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderColor: colors.light.border,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeChip: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});
