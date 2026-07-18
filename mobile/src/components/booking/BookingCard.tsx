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
  <Pressable accessibilityRole="button" onPress={onPress}>
    <Card style={styles.card}>
      <View style={styles.row}>
        <View>
          <AppText variant="h3">{booking.slotCode}</AppText>
          <AppText color={colors.light.text.secondary}>{floorName(booking.floorId)}</AppText>
        </View>
        <StatusBadge status={booking.status} />
      </View>
      <AppText variant="body2">
        {format(new Date(booking.startTime), 'dd/MM/yyyy HH:mm')} -{' '}
        {format(new Date(booking.endTime), 'HH:mm')}
      </AppText>
      <View style={styles.row}>
        <AppText color={colors.light.text.secondary}>{booking.licensePlate}</AppText>
        <AppText variant="h3">{formatCurrency(booking.finalAmount || booking.totalAmount || 0)}</AppText>
      </View>
    </Card>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
