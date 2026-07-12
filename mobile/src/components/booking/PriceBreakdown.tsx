import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/common';
import { colors, spacing } from '@/theme';
import { formatCurrency } from '@/utils/formatters';

interface PriceBreakdownProps {
  parkingCost: number;
  serviceCost: number;
  refundAmount?: number;
  finalTotal: number;
}

export const PriceBreakdown = ({
  parkingCost,
  serviceCost,
  refundAmount = 0,
  finalTotal,
}: PriceBreakdownProps) => (
  <Card style={styles.card}>
    <AppText variant="h3">Price breakdown</AppText>
    <View style={styles.row}>
      <AppText>Parking</AppText>
      <AppText>{formatCurrency(parkingCost)}</AppText>
    </View>
    <View style={styles.row}>
      <AppText>Services</AppText>
      <AppText>{formatCurrency(serviceCost)}</AppText>
    </View>
    {refundAmount > 0 ? (
      <View style={styles.row}>
        <AppText color={colors.success.main}>Refund</AppText>
        <AppText color={colors.success.main}>{formatCurrency(refundAmount)}</AppText>
      </View>
    ) : null}
    <View style={[styles.row, styles.total]}>
      <AppText variant="h3">Total</AppText>
      <AppText variant="h3">{formatCurrency(finalTotal)}</AppText>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  total: {
    borderTopColor: colors.light.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
});
