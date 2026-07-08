import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import type { ProfileStackParamList } from '@/navigation/types';
import { policiesService } from '@/services/api/policies';
import { colors, spacing } from '@/theme';
import type { PolicyDetail } from '@/types/models';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PolicyDetail'>;

export const PolicyDetailScreen = ({ route }: Props) => {
  const toast = useToast();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await policiesService.getPolicyBySlug(route.params.slug);
        setPolicy(response.data || null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [route.params.slug]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height * 0.9);
  };

  const accept = async () => {
    if (!policy) return;
    const id = policy._id || policy.id || '';
    setAccepting(true);
    try {
      await policiesService.acceptPolicy(id);
      setPolicy({ ...policy, isAccepted: true, acceptedAt: new Date().toISOString() });
      toast.showSuccess('Policy accepted');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSpinner />
      </Screen>
    );
  }

  if (!policy) {
    return (
      <Screen>
        <AppText>Policy not found.</AppText>
      </Screen>
    );
  }

  const accepted = Boolean(policy.isAccepted || policy.acceptedAt);

  return (
    <Screen scrollable contentStyle={styles.content} onScroll={handleScroll}>
      <AppText variant="h1">{policy.title}</AppText>
      <AppText color={colors.light.text.secondary}>Version {policy.currentVersion || policy.versionNumber}</AppText>
      <Card>
        <AppText>{policy.content}</AppText>
      </Card>
      {policy.versionHistory?.length ? (
        <View style={styles.history}>
          <AppText variant="h3">Version History</AppText>
          {policy.versionHistory.map((version) => (
            <AppText key={version.versionNumber} color={colors.light.text.secondary}>
              {version.versionNumber} - {version.changeSummary || 'Published'}
            </AppText>
          ))}
        </View>
      ) : null}
      {accepted ? (
        <AppText color={colors.success.main}>
          Accepted on {new Date(policy.acceptedAt || '').toLocaleDateString('vi-VN')}
        </AppText>
      ) : policy.requiresAcceptance ? (
        <Button disabled={!atEnd} loading={accepting} title="Accept Policy" onPress={accept} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  history: {
    gap: spacing.sm,
  },
});

