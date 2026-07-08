import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { Wallet } from '@/types/models';
import { walletService } from '@/services/api/wallet';
import { formatCurrency } from '@/utils/formatters';
import { colors, spacing } from '@/theme';

export const WalletScreen = ({ navigation }: { navigation?: { navigate: (route: string) => void } }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const response = await walletService.getWallet();
      setWallet(response.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <AppText variant="h1">Wallet</AppText>
        <AppText color={wallet?.status === 'frozen' ? colors.error.main : colors.success.main} variant="body2">
          {(wallet?.status || 'active').toUpperCase()}
        </AppText>
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card style={styles.card}>
          <AppText variant="h3">Balance</AppText>
          <AppText variant="h1">{formatCurrency(wallet?.balance || 0)}</AppText>
          <AppText color={colors.light.text.secondary}>
            Overdraft limit: {formatCurrency(wallet?.overdraftLimit ?? -100000)}
          </AppText>
        </Card>
      )}
      <View style={styles.grid}>
        <Card style={styles.stat}>
          <AppText color={colors.light.text.secondary} variant="caption">
            Lifetime top-up
          </AppText>
          <AppText variant="h3">{formatCurrency(wallet?.totalTopUp || wallet?.totalDeposited || 0)}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText color={colors.light.text.secondary} variant="caption">
            Lifetime spent
          </AppText>
          <AppText variant="h3">{formatCurrency(wallet?.totalSpent || 0)}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText color={colors.light.text.secondary} variant="caption">
            Lifetime refunded
          </AppText>
          <AppText variant="h3">{formatCurrency(wallet?.totalRefunded || 0)}</AppText>
        </Card>
      </View>
      <Card style={styles.card}>
        <AppText variant="h3">This month</AppText>
        <AppText>Top-up: {formatCurrency(wallet?.monthlyTopUp || 0)}</AppText>
        <AppText>Spent: {formatCurrency(wallet?.monthlySpent || 0)}</AppText>
        <AppText>Refunded: {formatCurrency(wallet?.monthlyRefunded || 0)}</AppText>
      </Card>
      <Button title="Top Up" onPress={() => navigation?.navigate('TopUp')} />
      <Button
        title="Transaction History"
        variant="outline"
        onPress={() => navigation?.navigate('TransactionHistory')}
      />
      <Button title="VIP Membership" variant="outline" onPress={() => navigation?.navigate('Membership')} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    gap: spacing.sm,
  },
  grid: {
    gap: spacing.md,
  },
  stat: {
    gap: spacing.xs,
  },
});
