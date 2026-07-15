import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { BookingCard } from '@/components/booking/BookingCard';
import { AppText, Button, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useBooking } from '@/hooks/useBooking';
import type { BookingStackParamList } from '@/navigation/types';
import { borderRadius, colors, spacing } from '@/theme';
import { bookingStatuses, BookingStatus } from '@/types/booking.types';

type Props = NativeStackScreenProps<BookingStackParamList, 'MyBookings'>;
type Filter = BookingStatus | 'all';

export const MyBookingsScreen = ({ navigation }: Props) => {
  const { bookings, filterStatus, isLoading, fetchBookings, setFilterStatus } = useBooking();

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const filters: Filter[] = ['all', ...bookingStatuses];
  const filteredBookings = useMemo(
    () =>
      filterStatus === 'all'
        ? bookings
        : bookings.filter((booking) => booking.status === filterStatus),
    [bookings, filterStatus],
  );

  const countFor = (status: Filter) =>
    status === 'all' ? bookings.length : bookings.filter((booking) => booking.status === status).length;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="h1">My Bookings</AppText>
        <Button title="New" onPress={() => navigation.navigate('BookingBrowse')} />
      </View>
      <View style={styles.filters}>
        {filters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setFilterStatus(filter)}
            style={[styles.filter, filterStatus === filter && styles.filterActive]}
          >
            <AppText color={filterStatus === filter ? colors.light.text.inverse : colors.light.text.primary} variant="caption">
              {filter} ({countFor(filter)})
            </AppText>
          </Pressable>
        ))}
      </View>
      {isLoading && bookings.length === 0 ? <LoadingSpinner /> : null}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          !isLoading ? (
            <AppText color={colors.light.text.secondary}>
              {bookings.length === 0 ? 'No bookings yet.' : 'No bookings with this status.'}
            </AppText>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchBookings} />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item._id })}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filter: {
    borderColor: colors.light.border,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});
