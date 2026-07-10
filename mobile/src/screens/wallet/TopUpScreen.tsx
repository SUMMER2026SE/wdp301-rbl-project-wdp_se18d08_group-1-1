import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, ScreenHeader, SectionTitle } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { WalletStackParamList } from '@/navigation/types';
import { walletService } from '@/services/api/wallet';
import { formatCurrency } from '@/utils/formatters';
import { isValidTopUpAmount, TOP_UP_MIN_AMOUNT } from '@/utils/walletSubscription';

type Props = NativeStackScreenProps<WalletStackParamList, 'TopUp'>;

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export const TopUpScreen = ({ navigation }: Props) => {
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
      setError(`Số tiền nạp tối thiểu là ${formatCurrency(TOP_UP_MIN_AMOUNT)}.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await walletService.createTopUp({ amount: numericAmount, paymentMethod: 'payos' });
      setPayment(response.data);
      setStatus('PENDING');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nạp tiền thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!payment) {
      return;
    }
    try {
      const response = await walletService.getTopUpStatus(payment.orderCode);
      setStatus(response.data?.status || 'PENDING');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Không thể kiểm tra thanh toán.');
    }
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
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Nạp tiền" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <SectionTitle>Số tiền</SectionTitle>
          <View style={styles.inputWrap}>
            <TextInput
              keyboardType="numeric"
              placeholder="Nhập số tiền"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={amount}
              onChangeText={(value) => {
                setAmount(value.replace(/[^\d]/g, ''));
                setError('');
              }}
            />
            <Text style={styles.currency}>VND</Text>
          </View>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                activeOpacity={0.75}
                style={[styles.quickChip, Number(amount) === value && styles.quickChipActive]}
                onPress={() => setAmount(String(value))}
              >
                <Text style={[styles.quickText, Number(amount) === value && styles.quickTextActive]}>
                  {formatCurrency(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && !payment ? <ErrorState message={error} /> : null}

        <TouchableOpacity activeOpacity={0.85} disabled={loading} style={[styles.primaryButton, loading && styles.disabled]} onPress={handleSubmit}>
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={COLORS.textInverse} />
              <Text style={styles.primaryButtonText}>Tiếp tục thanh toán</Text>
            </>
          )}
        </TouchableOpacity>

        {payment ? (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View>
                <Text style={styles.paymentTitle}>PayOS</Text>
                <Text style={styles.paymentMeta}>Mã đơn: {payment.orderCode}</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(payment.amount || Number(amount))}</Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="sync-circle-outline" size={18} color={COLORS.gold} />
              <Text style={styles.statusText}>Trạng thái: {status}</Text>
            </View>
            {payment.qrCode ? <Image source={{ uri: payment.qrCode }} style={styles.qr} /> : null}
            <Text style={styles.helpText}>
              Quét QR bằng ứng dụng ngân hàng hoặc mở trang thanh toán PayOS. Hệ thống sẽ tự cập nhật qua webhook.
            </Text>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.outlineButton} onPress={() => Linking.openURL(payment.checkoutUrl)}>
                <Text style={styles.outlineButtonText}>Mở PayOS</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.outlineButton} onPress={checkStatus}>
                <Text style={styles.outlineButtonText}>Kiểm tra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelButton}
                onPress={async () => {
                  const response = await walletService.getTopUpStatus(payment.orderCode, true);
                  setStatus(response.data?.status || 'CANCELLED');
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  scroll: {
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  amountCard: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
    padding: SPACING.md,
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: SPACING.md,
  },
  input: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  currency: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickChip: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  quickChipActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: COLORS.gold,
  },
  quickText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  quickTextActive: {
    color: COLORS.gold,
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
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
    padding: SPACING.md,
  },
  paymentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  paymentTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
  },
  paymentMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  paymentAmount: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  qr: {
    alignSelf: 'center',
    borderRadius: RADIUS.md,
    height: 220,
    width: 220,
  },
  helpText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  inlineError: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
  },
  actions: {
    gap: SPACING.sm,
  },
  outlineButton: {
    alignItems: 'center',
    borderColor: 'rgba(212,175,55,0.32)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
});
