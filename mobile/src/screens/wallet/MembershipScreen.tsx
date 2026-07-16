import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { subscriptionsService } from '@/services/api/subscriptions';
import type { MembershipStatus } from '@/types/subscription.types';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<WalletStackParamList, 'Membership'>;

export const MembershipScreen = ({ navigation }: Props) => {
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembership = useCallback(async () => {
    setError('');
    try {
      const response = await subscriptionsService.getMembership();
      setMembership(response.data || null);
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
                  <Text style={styles.slotText}>
                    {slot.slotCode} - {slot.floorName || `Floor ${slot.floorNumber || ''}`}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <SectionTitle>Renewal</SectionTitle>
            <View style={styles.renewalCard}>
              <Text style={styles.renewalPrice}>{formatCurrency(membership.renewal.price)}</Text>
              {membership.renewal.nextRenewalDate ? (
                <Text style={styles.renewalMeta}>Next renewal: {formatDate(membership.renewal.nextRenewalDate)}</Text>
              ) : null}
              <Text style={styles.renewalMessage}>{membership.renewal.message}</Text>
            </View>
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
    flex: 1,
    fontSize: FONT_SIZES.sm,
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
