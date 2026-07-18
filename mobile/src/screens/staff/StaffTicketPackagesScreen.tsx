import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import type { StaffManagementStackParamList } from '@/navigation/StaffNavigator';
import { staffService, type TicketPackage } from '@/services/api/staff';

type Props = NativeStackScreenProps<StaffManagementStackParamList, 'TicketPackages'>;

const TYPE_COLORS: Record<TicketPackage['type'], string> = {
  hourly: '#22D3EE',
  daily: '#60B4FF',
  monthly: COLORS.gold,
  yearly: '#C084FC',
};

export function StaffTicketPackagesScreen({ navigation }: Props) {
  const [items, setItems] = useState<TicketPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await staffService.getTicketPackages();
      setItems(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ticket packages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader
        title="Ticket packages"
        subtitle={`${items.length} ${items.length === 1 ? 'package' : 'packages'}`}
        onBack={() => navigation.navigate('ManagementHome')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={COLORS.gold} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.readOnlyNotice}>
            <View style={styles.noticeIcon}>
              <Ionicons name="eye-outline" size={18} color={COLORS.gold} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>View-only access</Text>
              <Text style={styles.noticeText}>
                Ticket packages are created and managed by administrators.
              </Text>
            </View>
          </View>

          {items.length === 0 ? (
            <EmptyState
              icon="ticket-outline"
              title="No ticket packages"
              message="No ticket packages are currently configured."
              accentColor={COLORS.gold}
            />
          ) : (
            items.map((item) => {
              const accent = TYPE_COLORS[item.type];

              return (
                <View key={item._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.packageIcon, { borderColor: `${accent}66` }]}>
                      <Ionicons name="pricetag-outline" size={21} color={accent} />
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        item.isActive ? styles.activeBadge : styles.inactiveBadge,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.isActive ? COLORS.success : COLORS.textMuted },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: item.isActive ? COLORS.success : COLORS.textMuted },
                        ]}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.typeBadge, { backgroundColor: `${accent}1F` }]}>
                    <Text style={[styles.typeText, { color: accent }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{item.price.toLocaleString('vi-VN')}</Text>
                    <Text style={styles.currency}>VND</Text>
                  </View>

                  {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                  ) : (
                    <Text style={styles.descriptionMuted}>No description provided.</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 80,
    gap: SPACING.md,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.gold}40`,
    backgroundColor: `${COLORS.gold}0D`,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.gold}1A`,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 17,
    marginTop: 2,
  },
  card: {
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  packageIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceElevated,
  },
  statusBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  activeBadge: {
    borderColor: `${COLORS.success}45`,
    backgroundColor: `${COLORS.success}14`,
  },
  inactiveBadge: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.round,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  typeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  price: {
    color: COLORS.goldLight,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
  },
  currency: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  descriptionMuted: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
});
