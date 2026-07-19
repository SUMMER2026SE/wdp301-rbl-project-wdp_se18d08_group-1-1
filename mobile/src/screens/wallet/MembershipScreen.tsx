import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Crypto from 'expo-crypto';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { WalletStackParamList } from '@/navigation/types';
import { subscriptionsService } from '@/services/api/subscriptions';
import { walletService } from '@/services/api/wallet';
import type { MembershipStatus, SubscriptionPaymentMethod, SubscriptionRenewalQuote } from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'Membership'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const STICKY_CTA_SPACE = 118;

function useEntrance(delay = 0) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      delay,
      duration: 440,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return progress;
}

function StaggeredView({
  children,
  delay,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  style?: object;
}) {
  const entrance = useEntrance(delay);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function AnimatedPressable({
  children,
  disabled,
  onPress,
  style,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });

  const animatePress = (toValue: number) => {
    Animated.spring(press, {
      damping: 16,
      mass: 0.55,
      stiffness: 260,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function BackgroundGlow() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.bgGlowTop, { opacity, transform: [{ scale }] }]} />
      <View style={styles.bgGlowBottom} />
      <View style={styles.vignette} />
    </View>
  );
}

function MembershipHero({
  active,
  membership,
}: {
  active: boolean;
  membership: MembershipStatus;
}) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sweep, {
      delay: 360,
      duration: 920,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [sweep]);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-180, 260] });
  const statusColor = active ? COLORS.success : COLORS.error;
  const expiration = membership.expireAt ? `Expires ${formatDate(membership.expireAt)}` : 'No expiration date';
  const packageName = membership.package?.name ?? 'VALO Membership';
  const tier = membership.package?.type ? `${membership.package.type} tier` : 'Membership';

  return (
    <StaggeredView delay={80} style={styles.heroWrap}>
      <LinearGradient
        colors={active
          ? ['rgba(226,186,75,0.18)', 'rgba(20,18,15,0.9)', 'rgba(8,8,9,0.98)']
          : ['rgba(255,77,77,0.16)', 'rgba(22,14,14,0.9)', 'rgba(8,8,9,0.98)']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroRim, { borderColor: active ? 'rgba(226,186,75,0.42)' : 'rgba(255,77,77,0.35)' }]} />
      <View style={styles.heroTexture}>
        <View style={styles.textureLineA} />
        <View style={styles.textureLineB} />
        <View style={styles.textureOrb} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '16deg' }] }]}
      />

      <View style={styles.heroTop}>
        <View style={[styles.heroIcon, { borderColor: active ? 'rgba(226,186,75,0.4)' : 'rgba(255,77,77,0.4)' }]}>
          <Ionicons name="ribbon-outline" size={26} color={active ? COLORS.gold : COLORS.error} />
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{active ? 'Active' : 'Expired'}</Text>
        </View>
      </View>

      <Text numberOfLines={1} style={styles.packageName}>{packageName}</Text>
      <View style={styles.heroMetaRow}>
        <Text numberOfLines={1} style={styles.expireText}>{expiration}</Text>
        <View style={styles.metaDivider} />
        <Text numberOfLines={1} style={styles.tierText}>{tier}</Text>
      </View>
      {membership.expirationWarning ? (
        <View style={styles.warningInline}>
          <Ionicons name="alert-circle-outline" size={15} color={COLORS.warning} />
          <Text style={styles.warningText}>Your membership expires within 7 days.</Text>
        </View>
      ) : null}
    </StaggeredView>
  );
}

function BenefitsStrip({ membership }: { membership: MembershipStatus }) {
  return (
    <StaggeredView delay={170} style={styles.benefitsBlock}>
      <View style={styles.metricStrip}>
        <MetricItem
          icon="gift-outline"
          label="Complimentary Services"
          value={membership.freeServiceCount}
        />
        <View style={styles.metricDivider} />
        <MetricItem
          icon="location-outline"
          label="Reserved Spaces"
          value={membership.reservedSlots.length}
        />
      </View>
      {(membership.benefits ?? []).length > 0 ? (
        <View style={styles.benefitList}>
          {(membership.benefits ?? []).map((benefit, index) => (
            <View key={benefit}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle-outline" size={17} color={COLORS.success} />
                <Text numberOfLines={2} style={styles.benefitText}>{benefit}</Text>
              </View>
              {index < (membership.benefits ?? []).length - 1 ? <View style={styles.inlineDivider} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </StaggeredView>
  );
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricItem}>
      <View style={styles.metricLabelRow}>
        <Ionicons name={icon} size={16} color={COLORS.gold} />
        <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MinimalHeading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.minimalHeading}>{children}</Text>;
}

function ReservedSpacesBlock({ membership }: { membership: MembershipStatus }) {
  return (
    <StaggeredView delay={260} style={styles.sectionBlock}>
      <MinimalHeading>Reserved spaces</MinimalHeading>
      {membership.reservedSlots.length === 0 ? (
        <View style={styles.emptyReserved}>
          <View style={styles.emptyIcon}>
            <Ionicons name="car-sport-outline" size={22} color={COLORS.textMuted} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No reserved spaces</Text>
            <Text style={styles.emptyText}>Reserve one with a premium membership plan.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.slotList}>
          {membership.reservedSlots.map((slot, index) => (
            <View key={`${slot.floorId}-${slot.slotCode}`}>
              <View style={styles.slotRow}>
                <Ionicons name="location-outline" size={18} color={COLORS.gold} />
                <Text numberOfLines={1} style={styles.slotText}>
                  {slot.slotCode} - {slot.floorName || `Floor ${slot.floorNumber || ''}`}
                </Text>
              </View>
              {index < membership.reservedSlots.length - 1 ? <View style={styles.inlineDivider} /> : null}
            </View>
          ))}
        </View>
      )}
    </StaggeredView>
  );
}

function RenewalInfo({
  membership,
  renewalLoading,
  renewalQuote,
  onReview,
}: {
  membership: MembershipStatus;
  renewalLoading: boolean;
  renewalQuote: SubscriptionRenewalQuote | null;
  onReview: () => void;
}) {
  return (
    <StaggeredView delay={350} style={styles.sectionBlock}>
      <MinimalHeading>Renewal</MinimalHeading>
      <View style={styles.renewalSheet}>
        <View style={styles.renewalTop}>
          <View style={styles.renewalIcon}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.gold} />
          </View>
          <View style={styles.renewalCopy}>
            <Text style={styles.renewalLabel}>Renewal price</Text>
            <Text style={styles.renewalPrice}>{formatCurrency(membership.renewal.price)}</Text>
          </View>
        </View>
        {membership.renewal.nextRenewalDate ? (
          <Text style={styles.renewalMeta}>Next renewal: {formatDate(membership.renewal.nextRenewalDate)}</Text>
        ) : null}
        <Text style={styles.renewalMessage}>{membership.renewal.message}</Text>
        {membership.renewal.canRenew && !renewalQuote ? (
          <>
            <View style={styles.inlineDivider} />
            <AnimatedPressable disabled={renewalLoading} onPress={onReview} style={styles.reviewRenewalButton}>
              <View style={styles.reviewRenewalContent}>
                {renewalLoading ? (
                  <ActivityIndicator color={COLORS.gold} size="small" />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color={COLORS.gold} />
                )}
                <Text style={styles.reviewRenewalText}>Review renewal</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gold} />
              </View>
            </AnimatedPressable>
          </>
        ) : null}
      </View>
    </StaggeredView>
  );
}

function RenewalReviewPanel({
  renewalError,
  renewalLoading,
  renewalMethod,
  renewalQuote,
  walletBalance,
  onConfirm,
  onMethodChange,
}: {
  renewalError: string;
  renewalLoading: boolean;
  renewalMethod: SubscriptionPaymentMethod;
  renewalQuote: SubscriptionRenewalQuote | null;
  walletBalance: number;
  onConfirm: () => void;
  onMethodChange: (method: SubscriptionPaymentMethod) => void;
}) {
  if (!renewalQuote) {
    return renewalError ? <Text style={styles.renewalError}>{renewalError}</Text> : null;
  }

  const walletInsufficient = renewalMethod === 'wallet' && walletBalance < renewalQuote.amount;

  return (
    <StaggeredView delay={420} style={styles.renewalReview}>
      <View style={styles.renewalDates}>
        <View style={styles.reviewDateColumn}>
          <Text style={styles.reviewLabel}>Current expiry</Text>
          <Text numberOfLines={1} style={styles.reviewValue}>{formatDate(renewalQuote.currentExpireAt)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
        <View style={[styles.reviewDateColumn, styles.reviewDateRight]}>
          <Text style={styles.reviewLabel}>New expiry</Text>
          <Text numberOfLines={1} style={styles.reviewValue}>{formatDate(renewalQuote.newExpireAt)}</Text>
        </View>
      </View>
      <View style={styles.inlineDivider} />
      <View style={styles.reviewAmountRow}>
        <View>
          <Text style={styles.reviewLabel}>Amount due</Text>
          <Text style={styles.reviewAmount}>{formatCurrency(renewalQuote.amount)}</Text>
        </View>
        <Text style={styles.reviewMeta}>{renewalQuote.retainedSlots.length} spaces retained</Text>
      </View>
      <View style={styles.methodRow}>
        {(['wallet', 'payos'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            activeOpacity={0.8}
            onPress={() => onMethodChange(method)}
            style={[styles.methodButton, renewalMethod === method && styles.methodButtonActive]}
          >
            <Ionicons
              name={method === 'wallet' ? 'wallet-outline' : 'qr-code-outline'}
              size={17}
              color={renewalMethod === method ? COLORS.gold : COLORS.textMuted}
            />
            <Text style={[styles.methodText, renewalMethod === method && styles.methodTextActive]}>
              {method === 'wallet' ? 'Wallet' : 'PayOS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {walletInsufficient ? <Text style={styles.renewalError}>Wallet balance is not enough.</Text> : null}
      {renewalError ? <Text style={styles.renewalError}>{renewalError}</Text> : null}
      <AnimatedPressable
        disabled={renewalLoading || walletInsufficient}
        onPress={onConfirm}
        style={styles.confirmRenewalButton}
      >
        <View style={[styles.confirmRenewalContent, (renewalLoading || walletInsufficient) && styles.disabled]}>
          {renewalLoading ? (
            <ActivityIndicator color={COLORS.textInverse} size="small" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textInverse} />
          )}
          <Text style={styles.renewButtonText}>Pay {formatCurrency(renewalQuote.amount)}</Text>
        </View>
      </AnimatedPressable>
    </StaggeredView>
  );
}

function StickyMembershipCTA({ onPress }: { onPress: () => void }) {
  const entrance = useEntrance(500);
  const arrow = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const translateX = arrow.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });

  const animateArrow = (toValue: number) => {
    Animated.spring(arrow, {
      damping: 15,
      mass: 0.5,
      stiffness: 260,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  const animatePress = (toValue: number) => {
    Animated.spring(press, {
      damping: 16,
      mass: 0.55,
      stiffness: 260,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.stickyCta,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [34, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onPressIn={() => {
            animateArrow(1);
            animatePress(1);
          }}
          onPressOut={() => {
            animateArrow(0);
            animatePress(0);
          }}
        >
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.primaryButton}
          >
            <Ionicons name="cube-outline" size={19} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>View membership plans</Text>
            <Animated.View style={{ transform: [{ translateX }] }}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textInverse} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export const MembershipScreen = ({ navigation }: Props) => {
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewalError, setRenewalError] = useState('');
  const [renewalQuote, setRenewalQuote] = useState<SubscriptionRenewalQuote | null>(null);
  const [renewalMethod, setRenewalMethod] = useState<SubscriptionPaymentMethod>('wallet');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [renewalKey, setRenewalKey] = useState('');

  const loadMembership = useCallback(async () => {
    setError('');
    try {
      const [membershipResponse, walletResponse] = await Promise.all([
        subscriptionsService.getMembership(),
        walletService.getWallet(),
      ]);
      setMembership(membershipResponse.data || null);
      setWalletBalance(walletResponse.data?.balance || 0);
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

  const openRenewal = async () => {
    if (!membership?.subscriptionId) return;
    setRenewalLoading(true);
    setRenewalError('');
    try {
      const response = await subscriptionsService.getRenewalQuote(membership.subscriptionId);
      setRenewalQuote(response.data || null);
      setRenewalMethod(walletBalance >= (response.data?.amount || 0) ? 'wallet' : 'payos');
      setRenewalKey(Crypto.randomUUID());
    } catch (renewError) {
      setRenewalError(renewError instanceof Error ? renewError.message : 'Unable to prepare renewal.');
    } finally {
      setRenewalLoading(false);
    }
  };

  const confirmRenewal = async () => {
    if (!membership?.subscriptionId || !renewalQuote || !renewalKey) return;
    setRenewalLoading(true);
    setRenewalError('');
    try {
      if (renewalMethod === 'wallet') {
        const response = await subscriptionsService.renewWithWallet(membership.subscriptionId, renewalKey);
        setWalletBalance(response.data?.walletBalance ?? Math.max(0, walletBalance - renewalQuote.amount));
        setRenewalQuote(null);
        await loadMembership();
      } else {
        const response = await subscriptionsService.createRenewalPayment(membership.subscriptionId, renewalKey);
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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <BackgroundGlow />
      <ScreenHeader
        accentColor={COLORS.gold}
        headerIcon="ribbon-outline"
        headerIconBackground="rgba(226,186,75,0.12)"
        headerIconColor={COLORS.gold}
        subtitle="Manage your VALO benefits"
        title="Membership"
        onBack={() => navigation.goBack()}
      />

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
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <MembershipHero active={active} membership={membership} />
            <BenefitsStrip membership={membership} />
            <ReservedSpacesBlock membership={membership} />
            <RenewalInfo
              membership={membership}
              renewalLoading={renewalLoading}
              renewalQuote={renewalQuote}
              onReview={openRenewal}
            />
            <RenewalReviewPanel
              renewalError={renewalError}
              renewalLoading={renewalLoading}
              renewalMethod={renewalMethod}
              renewalQuote={renewalQuote}
              walletBalance={walletBalance}
              onConfirm={confirmRenewal}
              onMethodChange={setRenewalMethod}
            />
          </ScrollView>
          <StickyMembershipCTA onPress={() => navigation.navigate('SubscriptionPackages')} />
        </>
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
  bgGlowTop: {
    backgroundColor: 'rgba(226,186,75,0.12)',
    borderRadius: 160,
    height: 320,
    position: 'absolute',
    right: -150,
    top: 72,
    width: 320,
  },
  bgGlowBottom: {
    backgroundColor: 'rgba(168,85,247,0.055)',
    borderRadius: 180,
    bottom: 110,
    height: 300,
    left: -180,
    position: 'absolute',
    width: 300,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  scroll: {
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: STICKY_CTA_SPACE + SPACING.xl,
  },
  heroWrap: {
    borderRadius: RADIUS.xl,
    minHeight: 154,
    overflow: 'hidden',
    padding: SPACING.lg,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
  },
  heroRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  heroTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  textureLineA: {
    backgroundColor: 'rgba(226,186,75,0.18)',
    height: 1,
    position: 'absolute',
    right: -24,
    top: 48,
    transform: [{ rotate: '-18deg' }],
    width: 210,
  },
  textureLineB: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 34,
    height: 1,
    left: -28,
    position: 'absolute',
    transform: [{ rotate: '16deg' }],
    width: 170,
  },
  textureOrb: {
    borderColor: 'rgba(226,186,75,0.24)',
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    position: 'absolute',
    right: 22,
    top: 44,
    width: 84,
  },
  heroSweep: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    height: 220,
    position: 'absolute',
    top: -34,
    width: 36,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
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
    fontWeight: '900',
  },
  packageName: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: SPACING.md,
  },
  heroMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 5,
  },
  expireText: {
    color: COLORS.textSecondary,
    flexShrink: 1,
    fontSize: FONT_SIZES.sm,
  },
  metaDivider: {
    backgroundColor: COLORS.borderLight,
    height: 12,
    width: 1,
  },
  tierText: {
    color: COLORS.gold,
    flexShrink: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  warningInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  warningText: {
    color: COLORS.warning,
    flex: 1,
    fontSize: FONT_SIZES.xs,
  },
  benefitsBlock: {
    gap: SPACING.md,
  },
  metricStrip: {
    alignItems: 'stretch',
    flexDirection: 'row',
    minHeight: 72,
  },
  metricItem: {
    flex: 1,
    justifyContent: 'center',
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metricLabel: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  metricValue: {
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  metricDivider: {
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
    width: StyleSheet.hairlineWidth,
  },
  benefitList: {
    gap: 0,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 42,
    paddingVertical: SPACING.xs,
  },
  benefitText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
  },
  sectionBlock: {
    gap: SPACING.md,
  },
  minimalHeading: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  emptyReserved: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 72,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: RADIUS.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  slotList: {
    gap: 0,
  },
  slotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 48,
    paddingVertical: SPACING.xs,
  },
  slotText: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  renewalSheet: {
    gap: SPACING.sm,
  },
  renewalTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  renewalIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(226,186,75,0.1)',
    borderRadius: RADIUS.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  renewalCopy: {
    flex: 1,
    minWidth: 0,
  },
  renewalLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  renewalPrice: {
    color: COLORS.gold,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
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
  reviewRenewalButton: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  reviewRenewalContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(226,186,75,0.09)',
    borderColor: 'rgba(226,186,75,0.24)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
  },
  reviewRenewalText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  renewalReview: {
    borderColor: 'rgba(226,186,75,0.18)',
    borderRadius: RADIUS.lg,
    borderTopWidth: 1,
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  renewalDates: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  reviewDateColumn: {
    flex: 1,
    minWidth: 0,
  },
  reviewDateRight: { alignItems: 'flex-end' },
  reviewLabel: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  reviewValue: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: '800', marginTop: 3 },
  reviewAmountRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewAmount: { color: COLORS.gold, fontSize: FONT_SIZES.xxl, fontWeight: '900' },
  reviewMeta: { color: COLORS.textSecondary, flexShrink: 1, fontSize: FONT_SIZES.xs, textAlign: 'right' },
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
  methodButtonActive: { backgroundColor: 'rgba(226,186,75,0.1)', borderColor: COLORS.gold },
  methodText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: '800' },
  methodTextActive: { color: COLORS.gold },
  renewalError: { color: COLORS.error, fontSize: FONT_SIZES.xs, lineHeight: 18 },
  confirmRenewalButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  confirmRenewalContent: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: 50,
  },
  renewButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  disabled: { opacity: 0.45 },
  inlineDivider: {
    backgroundColor: COLORS.border,
    height: StyleSheet.hairlineWidth,
  },
  stickyCta: {
    bottom: 0,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    position: 'absolute',
    right: 0,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    flexShrink: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
  },
});
