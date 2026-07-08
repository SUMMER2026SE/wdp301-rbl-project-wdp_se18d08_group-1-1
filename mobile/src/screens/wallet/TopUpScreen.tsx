import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { walletService } from '@/services/api/wallet';
import { colors, spacing } from '@/theme';
import { formatCurrency } from '@/utils/formatters';
import { isValidTopUpAmount, TOP_UP_MIN_AMOUNT } from '@/utils/walletSubscription';

export const TopUpScreen = () => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<{
    orderCode: string | number;
    checkoutUrl: string;
    qrCode?: string;
    amount?: number;
  } | null>(null);
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    const numericAmount = Number(amount);

    if (!isValidTopUpAmount(numericAmount)) {
      setError(`Minimum top-up amount is ${formatCurrency(TOP_UP_MIN_AMOUNT)}.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await walletService.createTopUp({ amount: numericAmount, paymentMethod: 'payos' });
      setPayment(response.data);
      setStatus('PENDING');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Top up failed.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!payment) {
      return;
    }
    const response = await walletService.getTopUpStatus(payment.orderCode);
    setStatus(response.data?.status || 'PENDING');
  };

  useEffect(() => {
    if (!payment || status !== 'PENDING') {
      return;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt > 300000) {
        setStatus('TIMEOUT');
        clearInterval(interval);
        return;
      }
      void checkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [payment, status]);

  return (
    <Screen scrollable>
      <AppText variant="h1">Top Up</AppText>
      <Input keyboardType="numeric" label="Amount" onChangeText={setAmount} value={amount} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Continue" onPress={handleSubmit} />
      {payment ? (
        <Card style={styles.card}>
          <AppText variant="h3">PayOS payment</AppText>
          <AppText>Order: {payment.orderCode}</AppText>
          <AppText>Amount: {formatCurrency(payment.amount || Number(amount))}</AppText>
          <AppText>Status: {status}</AppText>
          {payment.qrCode ? <Image source={{ uri: payment.qrCode }} style={styles.qr} /> : null}
          <AppText color={colors.light.text.secondary}>
            Scan the QR with your banking app, then tap Check Status. Payments are also confirmed by webhook.
          </AppText>
          <View style={styles.actions}>
            <Button title="Open Checkout" onPress={() => Linking.openURL(payment.checkoutUrl)} />
            <Button title="Check Status" variant="outline" onPress={checkStatus} />
            <Button
              title="Cancel Payment"
              variant="ghost"
              onPress={async () => {
                const response = await walletService.getTopUpStatus(payment.orderCode, true);
                setStatus(response.data?.status || 'CANCELLED');
              }}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  qr: {
    alignSelf: 'center',
    height: 220,
    width: 220,
  },
  actions: {
    gap: spacing.md,
  },
});
