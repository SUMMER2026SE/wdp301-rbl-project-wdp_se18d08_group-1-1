import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { AppText, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { walletService } from '@/services/api/wallet';
import type { WalletTransaction } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const TransactionHistoryScreen = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await walletService.getTransactions({ page: 1, limit: 20 });
      setTransactions(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  return (
    <Screen>
      <AppText variant="h1">Transactions</AppText>
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
              <AppText variant="caption">{formatDate(item.createdAt)}</AppText>
            </Card>
          )}
        />
      )}
    </Screen>
  );
};
