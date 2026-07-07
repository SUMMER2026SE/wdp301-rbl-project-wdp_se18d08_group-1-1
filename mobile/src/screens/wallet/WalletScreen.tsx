import { useCallback, useEffect, useState } from 'react';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { Wallet } from '@/types/models';
import { walletService } from '@/services/api/wallet';
import { formatCurrency } from '@/utils/formatters';

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
    <Screen>
      <AppText variant="h1">Wallet</AppText>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <AppText variant="h3">Balance</AppText>
          <AppText variant="h1">{formatCurrency(wallet?.balance || 0)}</AppText>
        </Card>
      )}
      <Button title="Top Up" onPress={() => navigation?.navigate('TopUp')} />
      <Button
        title="Transaction History"
        variant="outline"
        onPress={() => navigation?.navigate('TransactionHistory')}
      />
    </Screen>
  );
};
