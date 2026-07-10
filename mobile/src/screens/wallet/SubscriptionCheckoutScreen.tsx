import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader, SectionTitle } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { WalletStackParamList } from '@/navigation/types';
import parkingFloorService from '@/services/ParkingFloorService';
import { subscriptionsService } from '@/services/api/subscriptions';
import { vehiclesService } from '@/services/api/vehicles';
import { walletService } from '@/services/api/wallet';
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

  const maxSlots = Math.min(3, vehicleCount);
  const hasEnoughWallet = (wallet?.balance || 0) >= (pkg?.price || 0);

  const loadData = useCallback(async () => {
    setError('');
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
      } else {
        setSlots([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu gói.');
      setSlots([]);
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
      if (current.length >= maxSlots) {
        return current;
      }
      return [...current, { floorId, slotCode }];
    });
  };

  const handlePurchase = async () => {
    if (!pkg) {
      setError('Không tìm thấy gói đã chọn.');
      return;
    }
    if (!validateSubscriptionSlots(selectedSlots.length, vehicleCount)) {
      setError(`Chọn 1-${maxSlots} chỗ theo số xe đã đăng ký.`);
      return;
    }
    if (method === 'wallet' && !hasEnoughWallet) {
      setError('Số dư ví không đủ.');
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
      setError(purchaseError instanceof Error ? purchaseError.message : 'Mua gói thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Thanh toán gói" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error && !pkg ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {pkg ? (
            <View style={styles.packageCard}>
              <Text style={styles.packageName}>{pkg.name}</Text>
              <Text style={styles.packagePrice}>{formatCurrency(pkg.price)}</Text>
              <Text style={styles.packageMeta}>
                Hết hạn: {calculateExpirationDate(pkg.type).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          ) : (
            <EmptyState icon="cube-outline" title="Không tìm thấy gói" message="Vui lòng quay lại chọn gói khác." />
          )}

          <View style={styles.section}>
            <SectionTitle>Phương thức thanh toán</SectionTitle>
            {(['wallet', 'payos'] as const).map((option) => {
              const active = method === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => setMethod(option)}
                >
                  <View style={styles.methodLeft}>
                    <Ionicons
                      name={option === 'wallet' ? 'wallet-outline' : 'qr-code-outline'}
                      size={20}
                      color={active ? COLORS.gold : COLORS.textMuted}
                    />
                    <Text style={[styles.methodText, active && styles.methodTextActive]}>
                      {option === 'wallet' ? 'Ví VALO' : 'PayOS QR'}
                    </Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} /> : null}
                </Pressable>
              );
            })}
            <Text style={[styles.walletBalance, { color: hasEnoughWallet ? COLORS.success : COLORS.error }]}>
              Số dư ví: {formatCurrency(wallet?.balance || 0)}
            </Text>
          </View>

          <View style={styles.section}>
            <SectionTitle>Chọn chỗ giữ riêng</SectionTitle>
            <Text style={styles.helperText}>Tối đa {maxSlots} chỗ theo số xe đã đăng ký.</Text>
            {slots.length === 0 ? (
              <EmptyState icon="car-outline" title="Chưa có chỗ khả dụng" message="Vui lòng thử lại sau." />
            ) : (
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
                      <Text style={[styles.slotText, selected && styles.slotTextActive]}>{slotCode}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
              <Text style={styles.warningText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity activeOpacity={0.85} disabled={submitting || !pkg} style={[styles.primaryButton, (submitting || !pkg) && styles.disabled]} onPress={handlePurchase}>
            {submitting ? (
              <ActivityIndicator color={COLORS.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textInverse} />
                <Text style={styles.primaryButtonText}>Xác nhận mua gói</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  stateWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  packageCard: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.28)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  packageName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
  },
  packagePrice: {
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: '900',
    marginTop: SPACING.sm,
  },
  packageMeta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  section: {
    gap: SPACING.sm,
  },
  methodCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: SPACING.md,
  },
  methodCardActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: COLORS.gold,
  },
  methodLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  methodText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  methodTextActive: {
    color: COLORS.gold,
  },
  walletBalance: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  slot: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    minWidth: 66,
    paddingHorizontal: SPACING.sm,
  },
  slotActive: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: COLORS.gold,
  },
  slotText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  slotTextActive: {
    color: COLORS.gold,
  },
  warningBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderColor: 'rgba(255,77,77,0.24)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  warningText: {
    color: COLORS.error,
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 54,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
});
