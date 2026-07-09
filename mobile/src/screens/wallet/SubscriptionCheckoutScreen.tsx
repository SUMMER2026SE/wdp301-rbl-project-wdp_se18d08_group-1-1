import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { WalletStackParamList } from '@/navigation/types';
import parkingFloorService from '@/services/ParkingFloorService';
import { subscriptionsService } from '@/services/api/subscriptions';
import { vehiclesService } from '@/services/api/vehicles';
import { walletService } from '@/services/api/wallet';
import { borderRadius, colors, spacing } from '@/theme';
import type { Slot } from '@/types/booking.types';
import type { Wallet } from '@/types/models';
import type { SubscriptionPackage, SubscriptionPaymentMethod, SubscriptionSlotSelection } from '@/types/subscription.types';
import { formatCurrency } from '@/utils/formatters';
import { calculateExpirationDate, validateSubscriptionSlots } from '@/utils/walletSubscription';

type Props = NativeStackScreenProps<WalletStackParamList, 'SubscriptionCheckout'>;

export const SubscriptionCheckoutScreen = ({ navigation, route }: Props) => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SubscriptionSlotSelection[]>([]);
  const [method, setMethod] = useState<SubscriptionPaymentMethod>('wallet');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pkg = useMemo(
    () => packages.find((item) => item._id === route.params.packageId),
    [packages, route.params.packageId],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [packageResponse, vehicleResponse, walletResponse, floors] = await Promise.all([
        subscriptionsService.getPackages(),
        vehiclesService.getMyVehicles(),
        walletService.getWallet(),
        parkingFloorService.getParkingFloors(),
      ]);
      setPackages(packageResponse.data || []);
      setVehicleCount((vehicleResponse.data || []).length);
      setWallet(walletResponse.data || null);

      const firstFloor = floors[0];
      if (firstFloor?._id) {
        const floorSlots = await parkingFloorService.getSlotsByFloor(firstFloor._id);
        setSlots(floorSlots.filter((slot) => slot.status !== 'occupied'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleSlot = (slot: Slot) => {
    const floorId = slot.floorId || '';
    const slotCode = slot.slotCode || slot.code || '';
    setSelectedSlots((current) => {
      const exists = current.some((item) => item.floorId === floorId && item.slotCode === slotCode);
      if (exists) {
        return current.filter((item) => !(item.floorId === floorId && item.slotCode === slotCode));
      }
      return [...current, { floorId, slotCode }];
    });
  };

  const handlePurchase = async () => {
    if (!pkg) {
      return;
    }
    if (!validateSubscriptionSlots(selectedSlots.length, vehicleCount)) {
      setError(`Select 1-${Math.min(3, vehicleCount)} slots based on your registered vehicles.`);
      return;
    }
    if (method === 'wallet' && (wallet?.balance || 0) < pkg.price) {
      setError('Insufficient wallet balance.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (method === 'wallet') {
        await subscriptionsService.payWithWallet({ packageId: pkg._id, slots: selectedSlots });
        navigation.navigate('Membership');
      } else {
        const response = await subscriptionsService.createPayment({ packageId: pkg._id, slots: selectedSlots });
        navigation.navigate('SubscriptionPaymentStatus', {
          orderCode: response.data.orderCode,
          checkoutUrl: response.data.checkoutUrl,
          qrCode: response.data.qrCode,
          amount: response.data.amount,
        });
      }
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : 'Subscription purchase failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSpinner />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppText variant="h1">Checkout</AppText>
      {pkg ? (
        <Card style={styles.card}>
          <AppText variant="h2">{pkg.name}</AppText>
          <AppText variant="h1">{formatCurrency(pkg.price)}</AppText>
          <AppText>Expires: {calculateExpirationDate(pkg.type).toLocaleDateString('vi-VN')}</AppText>
        </Card>
      ) : null}
      <Card style={styles.card}>
        <AppText variant="h3">Payment method</AppText>
        {(['wallet', 'payos'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.option, method === option && styles.optionActive]}
            onPress={() => setMethod(option)}
          >
            <AppText>{option === 'wallet' ? 'Wallet' : 'PayOS QR'}</AppText>
          </Pressable>
        ))}
        <AppText color={colors.light.text.secondary}>Wallet balance: {formatCurrency(wallet?.balance || 0)}</AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="h3">Select reserved slots</AppText>
        <AppText color={colors.light.text.secondary}>Maximum {Math.min(3, vehicleCount)} slots.</AppText>
        <View style={styles.slotGrid}>
          {slots.map((slot) => {
            const floorId = slot.floorId || '';
            const slotCode = slot.slotCode || slot.code || '';
            const selected = selectedSlots.some((item) => item.floorId === floorId && item.slotCode === slotCode);
            return (
              <Pressable
                key={`${floorId}-${slotCode}`}
                style={[styles.slot, selected && styles.slotActive]}
                onPress={() => toggleSlot(slot)}
              >
                <AppText color={selected ? colors.neutral.white : colors.light.text.primary}>{slotCode}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={submitting} title="Confirm Purchase" onPress={handlePurchase} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  option: {
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  optionActive: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    alignItems: 'center',
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 72,
  },
  slotActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});
