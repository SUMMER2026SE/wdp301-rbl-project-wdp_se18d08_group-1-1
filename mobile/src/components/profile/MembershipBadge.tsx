import { StyleSheet } from 'react-native';

import { AppText, Card } from '@/components/common';
import { colors, spacing } from '@/theme';
import type { UserMembership } from '@/types/models';

export const MembershipBadge = ({ membership }: { membership?: UserMembership }) => {
  if (!membership?.isVip) return null;
  return (
    <Card style={styles.card}>
      <AppText color={colors.warning.dark} variant="h3">VIP Membership</AppText>
      <AppText>Expires: {membership.expireAt ? new Date(membership.expireAt).toLocaleDateString('vi-VN') : 'N/A'}</AppText>
      <AppText>{membership.freeServiceCount || 0} free services remaining</AppText>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warning.light,
    gap: spacing.xs,
  },
});

