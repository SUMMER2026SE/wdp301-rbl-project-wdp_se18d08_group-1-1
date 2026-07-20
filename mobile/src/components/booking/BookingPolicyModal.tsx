import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { policiesService } from '@/services/api/policies';
import type { PolicyDetail } from '@/types/models';

interface BookingPolicyModalProps {
  visible: boolean;
  policySlug?: string;
  policySlugs?: string[];
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const SCROLL_THRESHOLD = 24;

export const BookingPolicyModal = ({
  visible,
  policySlug = 'booking-policy',
  policySlugs,
  onClose,
  onConfirm,
}: BookingPolicyModalProps) => {
  const [policyIndex, setPolicyIndex] = useState(0);
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);
  const policyQueue = policySlugs?.length ? policySlugs : [policySlug];
  const currentPolicySlug = policyQueue[policyIndex] ?? policySlug;

  const updateReadState = useCallback(() => {
    if (contentHeight.current <= viewportHeight.current + SCROLL_THRESHOLD) {
      setHasReadPolicy(true);
    }
  }, []);

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    setError('');
    setPolicy(null);
    setHasReadPolicy(false);
    viewportHeight.current = 0;
    contentHeight.current = 0;
    try {
      const response = await policiesService.getPolicyBySlug(currentPolicySlug);
      if (!response.data) throw new Error('The required policy is unavailable.');
      setPolicy(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the policy.');
    } finally {
      setLoading(false);
    }
  }, [currentPolicySlug]);

  useEffect(() => {
    if (visible) void loadPolicy();
  }, [loadPolicy, visible]);

  useEffect(() => {
    if (!visible) setPolicyIndex(0);
  }, [visible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_THRESHOLD) {
      setHasReadPolicy(true);
    }
  };

  const handleAccept = async () => {
    if (!policy || !hasReadPolicy || accepting) return;
    const policyId = String(policy._id ?? policy.id ?? '');
    if (!policyId) {
      setError('The policy identifier is missing.');
      return;
    }

    setAccepting(true);
    setError('');
    try {
      await policiesService.acceptPolicy(policyId);
      if (policyIndex < policyQueue.length - 1) {
        setPolicyIndex((current) => current + 1);
      } else {
        await onConfirm();
      }
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Unable to accept the policy.');
    } finally {
      setAccepting(false);
    }
  };

  const handleClose = () => {
    if (!accepting) onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconWrap}>
                <Ionicons color={COLORS.gold} name="document-text-outline" size={22} />
              </View>
              <View style={styles.headingText}>
                <Text numberOfLines={2} style={styles.title}>{policy?.title ?? 'Policy acceptance'}</Text>
                <Text style={styles.eyebrow}>
                  {policyQueue.length > 1
                    ? `Required policy ${policyIndex + 1} of ${policyQueue.length}`
                    : 'Required before continuing'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Close policy"
              disabled={accepting}
              hitSlop={12}
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons color={COLORS.textSecondary} name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, hasReadPolicy && styles.progressComplete]} />
          </View>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={COLORS.gold} size="large" />
              <Text style={styles.stateText}>Loading policy...</Text>
            </View>
          ) : policy ? (
            <ScrollView
              contentContainerStyle={styles.content}
              testID="policy-scroll"
              onContentSizeChange={(_, height) => {
                contentHeight.current = height;
                updateReadState();
              }}
              onLayout={(event) => {
                viewportHeight.current = event.nativeEvent.layout.height;
                updateReadState();
              }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
              style={styles.scroll}
            >
              {policy.description ? <Text style={styles.summary}>{policy.description}</Text> : null}
              <Text style={styles.body}>{policy.content}</Text>
              <View style={styles.endMarker}>
                <Ionicons color={COLORS.success} name="checkmark-circle-outline" size={18} />
                <Text style={styles.endText}>End of policy</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.state}>
              <Ionicons color={COLORS.error} name="alert-circle-outline" size={30} />
              <Text style={styles.errorText}>{error || 'Unable to load the policy.'}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadPolicy()}>
                <Ionicons color={COLORS.gold} name="refresh" size={18} />
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {error && policy ? (
            <View style={styles.errorBanner}>
              <Ionicons color={COLORS.error} name="alert-circle-outline" size={17} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable disabled={accepting} style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!policy || !hasReadPolicy || accepting}
              style={[styles.acceptButton, (!policy || !hasReadPolicy || accepting) && styles.acceptDisabled]}
              onPress={() => void handleAccept()}
            >
              {accepting ? (
                <ActivityIndicator color={COLORS.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons color={COLORS.textInverse} name="checkmark" size={19} />
                  <Text style={styles.acceptText}>{hasReadPolicy ? 'I agree' : 'Read to continue'}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.76)', flex: 1, justifyContent: 'center', padding: SPACING.md },
  sheet: { backgroundColor: COLORS.surface, borderColor: COLORS.borderLight, borderRadius: RADIUS.lg, borderWidth: 1, height: '88%', maxHeight: 720, maxWidth: 560, overflow: 'hidden', width: '100%' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md },
  titleWrap: { flex: 1, flexDirection: 'row', gap: SPACING.sm },
  iconWrap: { alignItems: 'center', backgroundColor: 'rgba(226,186,75,0.12)', borderRadius: RADIUS.sm, height: 42, justifyContent: 'center', width: 42 },
  headingText: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  eyebrow: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 3 },
  closeButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  progressTrack: { backgroundColor: COLORS.border, height: 3 },
  progressFill: { backgroundColor: COLORS.gold, height: 3, width: '35%' },
  progressComplete: { backgroundColor: COLORS.success, width: '100%' },
  scroll: { flex: 1, minHeight: 220 },
  content: { gap: SPACING.md, padding: SPACING.md, paddingBottom: SPACING.lg },
  summary: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '700', lineHeight: 22 },
  body: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, lineHeight: 22 },
  endMarker: { alignItems: 'center', borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: 'row', gap: SPACING.xs, paddingTop: SPACING.md },
  endText: { color: COLORS.success, fontSize: FONT_SIZES.xs, fontWeight: '700' },
  state: { alignItems: 'center', gap: SPACING.md, justifyContent: 'center', minHeight: 280, padding: SPACING.lg },
  stateText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  errorText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', borderColor: COLORS.gold, borderRadius: RADIUS.sm, borderWidth: 1, flexDirection: 'row', gap: SPACING.xs, minHeight: 42, paddingHorizontal: SPACING.md },
  retryText: { color: COLORS.gold, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  errorBanner: { alignItems: 'flex-start', backgroundColor: 'rgba(255,77,77,0.1)', borderTopColor: 'rgba(255,77,77,0.24)', borderTopWidth: 1, flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  errorBannerText: { color: COLORS.error, flex: 1, fontSize: FONT_SIZES.xs, lineHeight: 18 },
  actions: { borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  cancelButton: { alignItems: 'center', borderColor: COLORS.borderLight, borderRadius: RADIUS.sm, borderWidth: 1, flex: 1, height: 48, justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  acceptButton: { alignItems: 'center', backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, flex: 2, flexDirection: 'row', gap: SPACING.xs, height: 48, justifyContent: 'center' },
  acceptDisabled: { opacity: 0.45 },
  acceptText: { color: COLORS.textInverse, fontSize: FONT_SIZES.sm, fontWeight: '800' },
});
