import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  message,
  retryLabel = 'Thử lại',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="warning-outline" size={30} color={COLORS.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          style={styles.retry}
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={16} color={COLORS.textInverse} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderColor: 'rgba(255,77,77,0.24)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  retry: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.round,
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
    marginTop: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  retryText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
