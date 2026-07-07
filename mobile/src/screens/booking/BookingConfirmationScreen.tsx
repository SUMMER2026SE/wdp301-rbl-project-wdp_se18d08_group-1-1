import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PriceBreakdown } from '@/components/booking/PriceBreakdown';
import { QRCodeDisplay } from '@/components/booking/QRCodeDisplay';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { AppText, Button, Card } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/types';
import { colors } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<BookingStackParamList, 'BookingConfirmation'>;

export const BookingConfirmationScreen = ({ navigation, route }: Props) => {
  const { getBookingById } = useBooking();
  const booking = getBookingById(route.params.bookingId);

  if (!booking) {
    return (
      <Screen>
        <AppText variant="h1">Booking Confirmed</AppText>
        <QRCodeDisplay bookingId={route.params.bookingId} />
        <Button title="My Bookings" onPress={() => navigation.navigate('MyBookings')} />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppText variant="h1">Booking Confirmed</AppText>
      <QRCodeDisplay bookingId={booking._id} />
      <Card>
        <StatusBadge status={booking.status} />
        <AppText variant="h3">{booking.slotCode}</AppText>
        <AppText color={colors.light.text.secondary}>{booking.licensePlate}</AppText>
        <AppText>Start: {formatDate(booking.startTime)}</AppText>
        <AppText>End: {formatDate(booking.endTime)}</AppText>
        <AppText>Total paid: {formatCurrency(booking.finalAmount || booking.totalAmount || 0)}</AppText>
      </Card>
      {booking.services?.length ? (
        <Card>
          <AppText variant="h3">Services</AppText>
          {booking.services.map((service) => (
            <AppText key={service._id || service.serviceId || service.name}>
              {service.name} - {formatCurrency(service.price)}
            </AppText>
          ))}
        </Card>
      ) : null}
      <PriceBreakdown
        finalTotal={booking.finalAmount || booking.totalAmount || 0}
        parkingCost={booking.prepaidAmount || 0}
        serviceCost={booking.serviceAmount || 0}
      />
      <Button title="My Bookings" onPress={() => navigation.navigate('MyBookings')} />
    </Screen>
  );
};
