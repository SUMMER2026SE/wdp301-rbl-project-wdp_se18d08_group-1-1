import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { useToast } from '@/hooks/useToast';
import type { ProfileStackParamList } from '@/navigation/types';
import { policiesService } from '@/services/api/policies';
import type { PolicyDetail } from '@/types/models';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PolicyDetail'>;

export const PolicyDetailScreen = ({ navigation, route }: Props) => {
  const toast = useToast();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [atEnd, setAtEnd] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await policiesService.getPolicyBySlug(route.params.slug);
      setPolicy(response.data || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải chi tiết chính sách.');
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [route.params.slug]);

  useEffect(() => {
    void load();
  }, [load]);

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
      toast.showSuccess('Đã xác nhận chính sách');
    } catch (acceptError) {
      toast.showError(acceptError instanceof Error ? acceptError.message : 'Không thể xác nhận chính sách.');
    } finally {
      setAccepting(false);
    }
  };

  const accepted = Boolean(policy?.isAccepted || policy?.acceptedAt);
  const requiresAcceptance = Boolean(policy?.requiresAcceptance && !accepted);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader title="Chi tiết chính sách" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !policy ? (
        <EmptyState
          icon="document-text-outline"
          title="Không tìm thấy chính sách"
          message="Tài liệu này có thể đã được thay đổi hoặc ngừng công bố."
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            scrollEventThrottle={80}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Ionicons name="document-text-outline" size={28} color={COLORS.gold} />
              </View>
              <Text style={styles.title}>{policy.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Phiên bản {policy.currentVersion || policy.versionNumber || 'hiện tại'}</Text>
                {accepted ? (
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(126,232,162,0.12)' }]}>
                    <Text style={[styles.statusText, { color: COLORS.success }]}>Đã đồng ý</Text>
                  </View>
                ) : policy.requiresAcceptance ? (
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(255,159,67,0.12)' }]}>
                    <Text style={[styles.statusText, { color: COLORS.warning }]}>Cần xác nhận</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{policy.content}</Text>
            </View>

            {policy.versionHistory?.length ? (
              <View style={styles.section}>
                <SectionTitle>Lịch sử phiên bản</SectionTitle>
                {policy.versionHistory.map((version) => (
                  <View key={version.versionNumber} style={styles.versionRow}>
                    <View style={styles.versionDot} />
                    <View style={styles.versionBody}>
                      <Text style={styles.versionTitle}>Phiên bản {version.versionNumber}</Text>
                      <Text style={styles.versionMeta}>{version.changeSummary || 'Đã công bố'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {accepted && policy.acceptedAt ? (
              <View style={styles.acceptedBox}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                <Text style={styles.acceptedText}>
                  Đã đồng ý ngày {new Date(policy.acceptedAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {requiresAcceptance ? (
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!atEnd || accepting}
                style={[styles.acceptButton, (!atEnd || accepting) && styles.acceptButtonDisabled]}
                onPress={accept}
              >
                {accepting ? (
                  <ActivityIndicator color={COLORS.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textInverse} />
                    <Text style={styles.acceptButtonText}>
                      {atEnd ? 'Đồng ý chính sách' : 'Cuộn hết để đồng ý'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
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
  scroll: {
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.22)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: RADIUS.lg,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    lineHeight: 30,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  contentCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  contentText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 24,
  },
  section: {
    gap: SPACING.sm,
  },
  versionRow: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  versionDot: {
    backgroundColor: COLORS.gold,
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  versionBody: {
    flex: 1,
  },
  versionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  versionMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 3,
  },
  acceptedBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(126,232,162,0.1)',
    borderColor: 'rgba(126,232,162,0.24)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  acceptedText: {
    color: COLORS.success,
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    padding: SPACING.lg,
  },
  acceptButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 54,
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.55,
  },
  acceptButtonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
});
