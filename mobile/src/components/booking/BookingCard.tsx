import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';

import { AppText, Card } from '@/components/common';
import { colors, spacing } from '@/theme';
import type { Booking, ParkingFloor } from '@/types/booking.types';
import { formatCurrency } from '@/utils/formatters';

import { StatusBadge } from './StatusBadge';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

const floorName = (floorId: Booking['floorId']) => {
  if (typeof floorId === 'string') {
    return floorId;
  }

  return (floorId as ParkingFloor).name;
};

export const BookingCard = ({ booking, onPress }: BookingCardProps) => (
  <Pressable
    accessibilityLabel={`Booking ${booking.slotCode}, license plate ${booking.licensePlate}`}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => pressed && styles.pressed}
  >
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.slotIdentity}>
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={19} color={colors.primary[500]} />
          </View>
          <View style={styles.slotCopy}>
            <AppText variant="h3">{booking.slotCode}</AppText>
            <AppText color={colors.light.text.secondary} numberOfLines={1} variant="body2">
              {floorName(booking.floorId)}
            </AppText>
          </View>
        </View>
        <StatusBadge status={booking.status} />
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={16} color={colors.light.text.secondary} />
        <AppText color={colors.light.text.secondary} variant="body2">
          {format(new Date(booking.startTime), 'dd/MM/yyyy HH:mm')} -{' '}
          {format(new Date(booking.endTime), 'HH:mm')}
        </AppText>
      </View>
      <View style={styles.footerRow}>
        <View style={[styles.detailRow, styles.footerDetail]}>
          <Ionicons name="car-outline" size={16} color={colors.light.text.secondary} />
          <AppText color={colors.light.text.secondary} numberOfLines={1} variant="body2">
            {booking.licensePlate}
          </AppText>
        </View>
        <View style={styles.amountWrap}>
          <AppText color={colors.light.text.secondary} variant="caption">Total</AppText>
          <AppText color={colors.primary[500]} numberOfLines={1} variant="h3">
            {formatCurrency(booking.finalAmount || booking.totalAmount || 0)}
          </AppText>
        </View>
      </View>
    </Card>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  amountWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  footerRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.light.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  footerDetail: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  slotCopy: {
    flex: 1,
    minWidth: 0,
  },
});
