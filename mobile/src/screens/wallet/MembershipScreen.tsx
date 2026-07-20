import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Crypto from 'expo-crypto';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader, SectionTitle } from '@/components/common';
import { QRCodeDisplay } from '@/components/booking/QRCodeDisplay';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import type { WalletStackParamList } from '@/navigation/types';
import { subscriptionsService } from '@/services/api/subscriptions';
import { walletService } from '@/services/api/wallet';
import type {
  MembershipEntitlementTransfer,
  MembershipStatus,
  ReservedSlot,
  SubscriptionPaymentMethod,
  SubscriptionRenewalQuote,
} from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'Membership'>;

export const MembershipScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewalError, setRenewalError] = useState('');
  const [renewalQuote, setRenewalQuote] = useState<SubscriptionRenewalQuote | null>(null);
  const [renewalMethod, setRenewalMethod] = useState<SubscriptionPaymentMethod>('wallet');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [renewalKey, setRenewalKey] = useState('');
  const [renewalEntitlementId, setRenewalEntitlementId] = useState('');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrError, setQrError] = useState('');
  const [transfers, setTransfers] = useState<MembershipEntitlementTransfer[]>([]);
  const [transferSlot, setTransferSlot] = useState<ReservedSlot | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const loadMembership = useCallback(async () => {
    setError('');
    try {
      const [membershipResponse, walletResponse, transferResponse] = await Promise.all([
        subscriptionsService.getMembership(),
        walletService.getWallet(),
        subscriptionsService.getEntitlementTransfers(),
      ]);
      const membershipData = membershipResponse.data || null;
      setMembership(membershipData);
      setWalletBalance(walletResponse.data?.balance || 0);
      setTransfers(transferResponse.data || []);
      if (membershipData?.status === 'active' && membershipData.subscriptionId) {
        try {
          const qrResponse = await subscriptionsService.getMembershipQr(
            membershipData.subscriptionId,
          );
          setQrPayload(qrResponse.data?.payload || null);
          setQrError(qrResponse.data?.payload ? '' : 'Membership QR is unavailable.');
        } catch (qrLoadError) {
          setQrPayload(null);
          setQrError(
            qrLoadError instanceof Error
              ? qrLoadError.message
              : 'Unable to load membership QR.',
          );
        }
      } else {
        setQrPayload(null);
        setQrError('');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load membership.');
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  const active = membership?.status === 'active';

  const openRenewal = async (entitlementId?: string | null) => {
    if (!entitlementId && !membership?.subscriptionId) return;
    setRenewalLoading(true);
    setRenewalError('');
    try {
      const response = entitlementId
        ? await subscriptionsService.getEntitlementRenewalQuote(entitlementId)
        : await subscriptionsService.getRenewalQuote(membership!.subscriptionId!);
      setRenewalQuote(response.data || null);
      setRenewalEntitlementId(entitlementId || '');
      setRenewalMethod(walletBalance >= (response.data?.amount || 0) ? 'wallet' : 'payos');
      setRenewalKey(Crypto.randomUUID());
    } catch (renewError) {
      setRenewalError(renewError instanceof Error ? renewError.message : 'Unable to prepare renewal.');
    } finally {
      setRenewalLoading(false);
    }
  };

  const confirmRenewal = async () => {
    if ((!membership?.subscriptionId && !renewalEntitlementId) || !renewalQuote || !renewalKey) return;
    setRenewalLoading(true);
    setRenewalError('');
    try {
      if (renewalMethod === 'wallet') {
        const response = renewalEntitlementId
          ? await subscriptionsService.renewEntitlementWithWallet(
              renewalEntitlementId,
              renewalKey,
            )
          : await subscriptionsService.renewWithWallet(
              membership!.subscriptionId!,
              renewalKey,
            );
        setWalletBalance(response.data?.walletBalance ?? Math.max(0, walletBalance - renewalQuote.amount));
        setRenewalQuote(null);
        await loadMembership();
      } else {
        const response = renewalEntitlementId
          ? await subscriptionsService.createEntitlementRenewalPayment(
              renewalEntitlementId,
              renewalKey,
            )
          : await subscriptionsService.createRenewalPayment(
              membership!.subscriptionId!,
              renewalKey,
            );
        navigation.navigate('SubscriptionPaymentStatus', {
          orderCode: response.data?.orderCode || 0,
          checkoutUrl: response.data?.checkoutUrl,
          qrCode: response.data?.qrCode,
          amount: response.data?.amount,
          renewal: true,
        });
      }
    } catch (renewError) {
      setRenewalError(renewError instanceof Error ? renewError.message : 'Renewal failed.');
    } finally {
      setRenewalLoading(false);
    }
  };

  const refreshTransfers = async () => {
    const response = await subscriptionsService.getEntitlementTransfers();
    setTransfers(response.data || []);
  };

  const submitTransfer = async () => {
    if (
      !transferSlot?.entitlementId ||
      !recipientEmail.trim() ||
      !transferReason.trim()
    ) return;
    setTransferLoading(true);
    setRenewalError('');
    try {
      await subscriptionsService.createEntitlementTransfer(
        transferSlot.entitlementId,
        {
          toUserEmail: recipientEmail.trim(),
          askingPrice: Number(askingPrice || 0),
          reason: transferReason.trim(),
        },
      );
      setTransferSlot(null);
      setRecipientEmail('');
      setAskingPrice('');
      setTransferReason('');
      await refreshTransfers();
    } catch (transferError) {
      setRenewalError(
        transferError instanceof Error
          ? transferError.message
          : 'Unable to create transfer.',
      );
    } finally {
      setTransferLoading(false);
    }
  };

  const updateTransfer = async (
    transfer: MembershipEntitlementTransfer,
    action: 'accept' | 'reject' | 'settle',
  ) => {
    setTransferLoading(true);
    setRenewalError('');
    try {
      if (action === 'accept') {
        await subscriptionsService.acceptEntitlementTransfer(transfer._id);
      } else if (action === 'reject') {
        await subscriptionsService.rejectEntitlementTransfer(transfer._id);
      } else {
        await subscriptionsService.settleEntitlementTransfer(transfer._id);
        await loadMembership();
      }
      await refreshTransfers();
    } catch (transferError) {
      setRenewalError(
        transferError instanceof Error ? transferError.message : 'Unable to update transfer.',
      );
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Membership" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadMembership} />
      ) : !membership ? (
        <EmptyState
          icon="ribbon-outline"
          title="No active membership"
          message="Choose a plan for reserved spaces and service benefits."
          actionLabel="View plans"
          onAction={() => navigation.navigate('SubscriptionPackages')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={active ? ['rgba(212,175,55,0.18)', 'rgba(13,13,13,0)'] : ['rgba(255,77,77,0.14)', 'rgba(13,13,13,0)']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: active ? 'rgba(212,175,55,0.14)' : 'rgba(255,77,77,0.12)' }]}>
                <Ionicons name="ribbon-outline" size={28} color={active ? COLORS.gold : COLORS.error} />
              </View>
              <View style={[styles.statusPill, { backgroundColor: active ? 'rgba(126,232,162,0.12)' : 'rgba(255,77,77,0.12)' }]}>
                <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.error }]} />
                <Text style={[styles.statusText, { color: active ? COLORS.success : COLORS.error }]}>
                  {active ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
            <Text style={styles.packageName}>{membership.package?.name ?? 'VALO Membership'}</Text>
            {membership.expireAt ? (
              <Text style={styles.expireText}>Expires: {formatDate(membership.expireAt)}</Text>
            ) : (
              <Text style={styles.expireText}>No expiration date</Text>
            )}
            {membership.expirationWarning ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                <Text style={styles.warningText}>Your membership expires within 7 days.</Text>
              </View>
            ) : null}
          </View>

          {active ? (
            <View style={styles.section}>
              <SectionTitle>Membership QR</SectionTitle>
              {qrPayload ? (
                <>
                  <QRCodeDisplay
                    value={qrPayload}
                    reference={membership.subscriptionId || undefined}
                    shareLabel="VALO membership"
                    shareTitle="Share membership pass"
                    showBrightnessControl
                  />
                  <Text style={styles.qrHint}>
                    Use this pass for every membership visit. It expires with your plan.
                  </Text>
                </>
              ) : (
                <View style={styles.softState}>
                  <Text style={styles.qrError}>
                    {qrError || 'Membership QR is unavailable.'}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle>Benefits</SectionTitle>
            <View style={styles.grid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{membership.freeServiceCount}</Text>
                <Text style={styles.metricLabel}>Complimentary services</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{membership.reservedSlots.length}</Text>
                <Text style={styles.metricLabel}>Reserved spaces</Text>
              </View>
            </View>
            {(membership.benefits ?? []).map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <SectionTitle>Reserved spaces</SectionTitle>
            {membership.reservedSlots.length === 0 ? (
              <View style={styles.softState}>
                <Text style={styles.softStateText}>No reserved spaces assigned.</Text>
              </View>
            ) : (
              membership.reservedSlots.map((slot) => (
                <View key={`${slot.floorId}-${slot.slotCode}`} style={styles.slotRow}>
                  <Ionicons name="location-outline" size={18} color={COLORS.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotText}>
                      {slot.slotCode} - {slot.floorName || `Floor ${slot.floorNumber || ''}`}
                    </Text>
                    {slot.expireAt ? (
                      <Text style={styles.renewalMeta}>Expires {formatDate(slot.expireAt)}</Text>
                    ) : null}
                  </View>
                  {slot.entitlementId ? (
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => void openRenewal(slot.entitlementId)}
                        style={styles.slotAction}
                      >
                        <Text style={styles.slotActionText}>Renew</Text>
                      </TouchableOpacity>
                      {slot.canTransfer ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setTransferSlot(slot)}
                          style={styles.slotAction}
                        >
                          <Text style={styles.slotActionText}>Transfer</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {transferSlot ? (
            <View style={styles.section}>
              <SectionTitle>{`Transfer ${transferSlot.slotCode}`}</SectionTitle>
              <View style={styles.transferForm}>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setRecipientEmail}
                  placeholder="Recipient email"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.transferInput}
                  value={recipientEmail}
                />
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setAskingPrice}
                  placeholder="Price in VND (0 is allowed)"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.transferInput}
                  value={askingPrice}
                />
                <TextInput
                  multiline
                  onChangeText={setTransferReason}
                  placeholder="Transfer reason"
                  placeholderTextColor={COLORS.textMuted}
                  style={[styles.transferInput, styles.transferReason]}
                  value={transferReason}
                />
                <Text style={styles.renewalMeta}>
                  Recipient pays the price plus a 5% fee (10,000-50,000 VND).
                </Text>
                <TouchableOpacity
                  disabled={transferLoading}
                  onPress={() => void submitTransfer()}
                  style={styles.renewButton}
                >
                  {transferLoading ? (
                    <ActivityIndicator color={COLORS.textInverse} size="small" />
                  ) : null}
                  <Text style={styles.renewButtonText}>Send invitation</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {transfers.length ? (
            <View style={styles.section}>
              <SectionTitle>Transfer requests</SectionTitle>
              {transfers.map((transfer) => {
                const recipientId =
                  typeof transfer.toUserId === 'string'
                    ? transfer.toUserId
                    : transfer.toUserId._id;
                const entitlement =
                  typeof transfer.entitlementId === 'string'
                    ? null
                    : transfer.entitlementId;
                const isRecipient = recipientId === (user?._id || user?.id);
                return (
                  <View key={transfer._id} style={styles.transferCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotText}>
                        {entitlement?.slotCode || 'Membership space'} · {transfer.status}
                      </Text>
                      <Text style={styles.renewalMeta}>
                        {formatCurrency(transfer.askingPrice)} + {formatCurrency(transfer.transferFee)} fee
                      </Text>
                    </View>
                    {isRecipient && transfer.status === 'PENDING_RECIPIENT' ? (
                      <View style={styles.slotActions}>
                        <TouchableOpacity
                          onPress={() => void updateTransfer(transfer, 'reject')}
                          style={styles.slotAction}
                        >
                          <Text style={styles.slotActionText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => void updateTransfer(transfer, 'accept')}
                          style={styles.slotAction}
                        >
                          <Text style={styles.slotActionText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {isRecipient && transfer.status === 'AWAITING_PAYMENT' ? (
                      <TouchableOpacity
                        onPress={() => void updateTransfer(transfer, 'settle')}
                        style={styles.slotAction}
                      >
                        <Text style={styles.slotActionText}>Pay wallet</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle>Renewal</SectionTitle>
            <View style={styles.renewalCard}>
              <Text style={styles.renewalPrice}>{formatCurrency(membership.renewal.price)}</Text>
              {membership.renewal.nextRenewalDate ? (
                <Text style={styles.renewalMeta}>Next renewal: {formatDate(membership.renewal.nextRenewalDate)}</Text>
              ) : null}
              <Text style={styles.renewalMessage}>{membership.renewal.message}</Text>
              {membership.renewal.canRenew &&
              !membership.reservedSlots.some((slot) => slot.entitlementId) &&
              !renewalQuote ? (
                <TouchableOpacity activeOpacity={0.85} style={styles.renewButton} onPress={() => void openRenewal()} disabled={renewalLoading}>
                  {renewalLoading ? <ActivityIndicator color={COLORS.textInverse} size="small" /> : <Ionicons name="refresh-outline" size={18} color={COLORS.textInverse} />}
                  <Text style={styles.renewButtonText}>Review renewal</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {renewalQuote ? (
              <View style={styles.renewalReview}>
                <View style={styles.renewalDates}>
                  <View>
                    <Text style={styles.reviewLabel}>Current expiry</Text>
                    <Text style={styles.reviewValue}>{formatDate(renewalQuote.currentExpireAt)}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
                  <View style={styles.reviewDateRight}>
                    <Text style={styles.reviewLabel}>New expiry</Text>
                    <Text style={styles.reviewValue}>{formatDate(renewalQuote.newExpireAt)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewAmount}>{formatCurrency(renewalQuote.amount)}</Text>
                <Text style={styles.reviewMeta}>{renewalQuote.retainedSlots.length} spaces retained</Text>
                <View style={styles.methodRow}>
                  {(['wallet', 'payos'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      activeOpacity={0.8}
                      onPress={() => setRenewalMethod(method)}
                      style={[styles.methodButton, renewalMethod === method && styles.methodButtonActive]}
                    >
                      <Ionicons name={method === 'wallet' ? 'wallet-outline' : 'qr-code-outline'} size={17} color={renewalMethod === method ? COLORS.gold : COLORS.textMuted} />
                      <Text style={[styles.methodText, renewalMethod === method && styles.methodTextActive]}>{method === 'wallet' ? 'Wallet' : 'PayOS'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {renewalMethod === 'wallet' && walletBalance < renewalQuote.amount ? (
                  <Text style={styles.renewalError}>Wallet balance is not enough.</Text>
                ) : null}
                {renewalError ? <Text style={styles.renewalError}>{renewalError}</Text> : null}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.confirmRenewalButton, renewalLoading && styles.disabled]}
                  disabled={renewalLoading || (renewalMethod === 'wallet' && walletBalance < renewalQuote.amount)}
                  onPress={confirmRenewal}
                >
                  {renewalLoading ? <ActivityIndicator color={COLORS.textInverse} size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textInverse} />}
                  <Text style={styles.renewButtonText}>Pay {formatCurrency(renewalQuote.amount)}</Text>
                </TouchableOpacity>
              </View>
            ) : renewalError ? <Text style={styles.renewalError}>{renewalError}</Text> : null}
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={() => navigation.navigate('SubscriptionPackages')}>
            <Ionicons name="cube-outline" size={20} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>View membership plans</Text>
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
  heroCard: {
    borderColor: 'rgba(212,175,55,0.22)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  packageName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    marginTop: SPACING.md,
  },
  expireText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: 4,
  },
  warningBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,159,67,0.1)',
    borderColor: 'rgba(255,159,67,0.24)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  warningText: {
    color: COLORS.warning,
    flex: 1,
    fontSize: FONT_SIZES.xs,
  },
  section: {
    gap: SPACING.sm,
  },
  qrHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  qrError: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  metricCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flex: 1,
    padding: SPACING.md,
  },
  metricValue: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  benefitRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  benefitText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  softState: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  softStateText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  slotRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  slotText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  slotAction: {
    borderColor: COLORS.gold,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  slotActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  slotActionText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  transferForm: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  transferInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.textPrimary,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
  },
  transferReason: {
    minHeight: 88,
    paddingTop: SPACING.md,
    textAlignVertical: 'top',
  },
  transferCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  renewalCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
    padding: SPACING.md,
  },
  renewalPrice: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
  },
  renewalMeta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  renewalMessage: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  renewButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.md,
    minHeight: 48,
  },
  renewButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  renewalReview: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.24)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
    padding: SPACING.md,
  },
  renewalDates: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewDateRight: { alignItems: 'flex-end' },
  reviewLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  reviewValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '800', marginTop: 3 },
  reviewAmount: { color: COLORS.gold, fontSize: FONT_SIZES.xxl, fontWeight: '900' },
  reviewMeta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  methodRow: { flexDirection: 'row', gap: SPACING.sm },
  methodButton: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
    minHeight: 46,
  },
  methodButtonActive: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: COLORS.gold },
  methodText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  methodTextActive: { color: COLORS.gold },
  renewalError: { color: COLORS.error, fontSize: FONT_SIZES.xs, lineHeight: 18 },
  confirmRenewalButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: 50,
  },
  disabled: { opacity: 0.45 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
});
