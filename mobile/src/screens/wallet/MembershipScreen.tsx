import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { WalletStackParamList } from '@/navigation/types';
import { subscriptionsService } from '@/services/api/subscriptions';
import { colors } from '@/theme';
import type { MembershipStatus } from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'Membership'>;

export const MembershipScreen = ({ navigation }: Props) => {
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = useCallback(async () => {
    setLoading(true);
    try {
      const response = await subscriptionsService.getMembership();
      setMembership(response.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  return (
    <Screen scrollable>
      <AppText variant="h1">VIP Membership</AppText>
      {loading ? <LoadingSpinner /> : null}
      {membership ? (
        <>
          <Card>
            <AppText color={membership.status === 'active' ? colors.success.main : colors.error.main} variant="h2">
              {membership.status.toUpperCase()}
            </AppText>
            {membership.expireAt ? <AppText>Expires: {formatDate(membership.expireAt)}</AppText> : null}
            {membership.expirationWarning ? (
              <AppText color={colors.warning.dark}>Your membership expires within 7 days.</AppText>
            ) : null}
            {membership.package ? (
              <>
                <AppText>Package: {membership.package.name}</AppText>
                <AppText>Type: {membership.package.type}</AppText>
              </>
            ) : null}
            <AppText>Free services: {membership.freeServiceCount}</AppText>
          </Card>
          <Card>
            <AppText variant="h3">Reserved Slots</AppText>
            {membership.reservedSlots.length === 0 ? (
              <AppText color={colors.light.text.secondary}>No reserved slots.</AppText>
            ) : (
              membership.reservedSlots.map((slot) => (
                <AppText key={`${slot.floorId}-${slot.slotCode}`}>
                  {slot.slotCode} - {slot.floorName || `Floor ${slot.floorNumber || ''}`}
                </AppText>
              ))
            )}
          </Card>
          <Card>
            <AppText variant="h3">Renewal</AppText>
            <AppText>Status: manual renewal</AppText>
            {membership.renewal.nextRenewalDate ? (
              <AppText>Next renewal: {formatDate(membership.renewal.nextRenewalDate)}</AppText>
            ) : null}
            <AppText>Renewal price: {formatCurrency(membership.renewal.price)}</AppText>
            <AppText color={colors.light.text.secondary}>{membership.renewal.message}</AppText>
          </Card>
        </>
      ) : null}
      <Button title="Browse Packages" onPress={() => navigation.navigate('SubscriptionPackages')} />
    </Screen>
  );
};
