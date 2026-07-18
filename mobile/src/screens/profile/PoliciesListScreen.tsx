import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { ProfileStackParamList } from '@/navigation/types';
import { policiesService } from '@/services/api/policies';
import { borderRadius, colors, spacing } from '@/theme';
import type { Policy, PolicyCategory } from '@/types/models';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Policies'>;

const categoryLabels: Record<PolicyCategory, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  refund: 'Refund Policy',
  parking_rules: 'Parking Rules',
  safety: 'Safety Guidelines',
  other: 'Other',
};

export const PoliciesListScreen = ({ navigation }: Props) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await policiesService.listPublishedPolicies();
      setPolicies(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () =>
      policies.reduce<Record<string, Policy[]>>((acc, policy) => {
        const key = policy.category || 'other';
        acc[key] = [...(acc[key] || []), policy];
        return acc;
      }, {}),
    [policies],
  );

  if (loading) {
    return (
      <Screen>
        <LoadingSpinner />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppText variant="h1">Policies</AppText>
      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} style={styles.group}>
          <AppText variant="h2">{categoryLabels[category as PolicyCategory] || categoryLabels.other}</AppText>
          {items.map((policy) => (
            <Pressable key={policy._id || policy.id || policy.slug} onPress={() => navigation.navigate('PolicyDetail', { slug: policy.slug })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <AppText variant="h3">{policy.title}</AppText>
                  {policy.isAccepted || policy.acceptedAt ? (
                    <AppText color={colors.success.main}>Accepted</AppText>
                  ) : policy.requiresAcceptance ? (
                    <AppText style={styles.required}>Required</AppText>
                  ) : null}
                </View>
                {policy.description ? <AppText color={colors.light.text.secondary}>{policy.description}</AppText> : null}
                <AppText color={colors.light.text.secondary} variant="caption">
                  Version {policy.currentVersion || policy.versionNumber || 'current'}
                </AppText>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  required: {
    backgroundColor: colors.warning.light,
    borderRadius: borderRadius.sm,
    color: colors.warning.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

