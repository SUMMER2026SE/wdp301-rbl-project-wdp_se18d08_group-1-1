import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  icon?: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export function EmptyState({
  icon = 'information-circle-outline',
  title,
  message,
  actionLabel,
  onAction,
  accentColor = COLORS.gold,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={accentColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          style={[styles.action, { borderColor: accentColor }]}
          onPress={onAction}
        >
          <Text style={[styles.actionText, { color: accentColor }]}>{actionLabel}</Text>
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
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
