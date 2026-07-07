import { useState } from 'react';
import { Linking } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { walletService } from '@/services/api/wallet';
import { colors } from '@/theme';

export const TopUpScreen = () => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await walletService.createTopUp({ amount: numericAmount, paymentMethod: 'payos' });
      if (response.data.checkoutUrl) {
        await Linking.openURL(response.data.checkoutUrl);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Top up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">Top Up</AppText>
      <Input keyboardType="numeric" label="Amount" onChangeText={setAmount} value={amount} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Continue" onPress={handleSubmit} />
    </Screen>
  );
};
