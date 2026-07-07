import { AppText, Card } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { colors } from '@/theme';

export const BookingsScreen = () => (
  <Screen>
    <AppText variant="h1">Bookings</AppText>
    <Card>
      <AppText variant="h3">Booking tools</AppText>
      <AppText color={colors.light.text.secondary}>Upcoming booking features will live here.</AppText>
    </Card>
  </Screen>
);
