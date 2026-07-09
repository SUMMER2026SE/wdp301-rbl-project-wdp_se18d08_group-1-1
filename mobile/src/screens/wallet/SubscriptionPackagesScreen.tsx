import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { WalletStackParamList } from '@/navigation/types';
import { subscriptionsService } from '@/services/api/subscriptions';
import { colors, spacing } from '@/theme';
import type { SubscriptionPackage } from '@/types/subscription.types';
import { formatCurrency } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'SubscriptionPackages'>;

export const SubscriptionPackagesScreen = ({ navigation }: Props) => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await subscriptionsService.getPackages();
      setPackages((response.data || []).filter((pkg) => pkg.isActive && ['monthly', 'yearly'].includes(pkg.type)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  return (
    <Screen scrollable>
      <AppText variant="h1">VIP Packages</AppText>
      {loading ? <LoadingSpinner /> : null}
      {packages.map((pkg) => (
        <Pressable
          key={pkg._id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('SubscriptionCheckout', { packageId: pkg._id })}
        >
          <Card style={styles.card}>
            <AppText variant="h2">{pkg.name}</AppText>
            <AppText color={colors.primary[600]} variant="h1">
              {formatCurrency(pkg.price)}
            </AppText>
            <AppText>{pkg.type === 'yearly' ? '12 months' : '1 month'}</AppText>
            {pkg.description ? <AppText color={colors.light.text.secondary}>{pkg.description}</AppText> : null}
            {pkg.type === 'yearly' ? <AppText color={colors.success.main}>Includes 12 free services</AppText> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
