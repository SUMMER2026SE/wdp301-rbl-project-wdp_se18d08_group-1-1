import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet } from 'react-native';

import { AppText, Button, Card } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { WalletStackParamList } from '@/navigation/types';
import { subscriptionsService } from '@/services/api/subscriptions';
import { colors, spacing } from '@/theme';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'SubscriptionPaymentStatus'>;

export const SubscriptionPaymentStatusScreen = ({ navigation, route }: Props) => {
  const [status, setStatus] = useState('PENDING');
  const [message, setMessage] = useState('Waiting for PayOS confirmation.');

  useEffect(() => {
    let stopped = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (stopped || Date.now() - startedAt > 300000 || status !== 'PENDING') {
        return;
      }
      try {
        if (route.params.renewal) {
          await subscriptionsService.verifyRenewalPayment(route.params.orderCode);
        } else {
          await subscriptionsService.verifyPayment({ orderCode: route.params.orderCode });
        }
        if (!stopped) {
          setStatus('PAID');
          setMessage(route.params.renewal ? 'Membership renewed successfully.' : 'Subscription activated successfully.');
        }
      } catch (error) {
        if (!stopped && error instanceof Error) {
          setMessage(error.message);
        }
      }
    };

    const interval = setInterval(() => void poll(), 3000);
    void poll();

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [route.params.orderCode, route.params.renewal, status]);

  return (
    <Screen scrollable>
      <AppText variant="h1">Payment Status</AppText>
      <Card style={styles.card}>
        <AppText color={status === 'PAID' ? colors.success.main : colors.warning.dark} variant="h2">
          {status}
        </AppText>
        <AppText>Order: {route.params.orderCode}</AppText>
        {route.params.amount ? <AppText>Amount: {formatCurrency(route.params.amount)}</AppText> : null}
        <AppText>{message}</AppText>
        {route.params.qrCode ? <Image source={{ uri: route.params.qrCode }} style={styles.qr} /> : null}
        {route.params.checkoutUrl ? (
          <Button title="Open PayOS Checkout" onPress={() => Linking.openURL(route.params.checkoutUrl || '')} />
        ) : null}
      </Card>
      <Button title="Check Membership" onPress={() => navigation.navigate('Membership')} />
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
});
