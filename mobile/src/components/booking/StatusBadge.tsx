import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/common';
import { borderRadius, colors, spacing } from '@/theme';
import type { BookingStatus } from '@/types/booking.types';

const statusColor: Record<BookingStatus, string> = {
  pending: colors.warning.main,
  confirmed: colors.primary[500],
  active: colors.success.main,
  paused: colors.warning.dark,
  completed: colors.neutral[600],
  cancelled: colors.error.main,
  expired: colors.warning.main,
};

export const StatusBadge = ({ status }: { status: BookingStatus }) => (
  <View style={[styles.badge, { backgroundColor: statusColor[status] }]}>
    <AppText color={colors.neutral.white} style={styles.text} variant="caption">
      {status.toUpperCase()}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontWeight: '700',
  },
});
