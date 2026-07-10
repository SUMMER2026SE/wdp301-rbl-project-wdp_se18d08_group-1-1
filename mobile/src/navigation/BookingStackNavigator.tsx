import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BookingListScreen } from '../screens/booking/BookingListScreen';
import { BookingDetailScreen } from '../screens/booking/BookingDetailScreen';
import { CreateBookingScreen } from '../screens/booking/CreateBookingScreen';
import { FindParkingScreen } from '../screens/booking/FindParkingScreen';

export type BookingStackParamList = {
  BookingList: undefined;
  BookingDetail: { bookingId: string };
  CreateBooking:
    | {
        selectedFloorId?: string;
        selectedFloorName?: string;
        selectedSlotCode?: string;
      }
    | undefined;
  FindParking: { floorId?: string; startTime?: string; endTime?: string };
};

const Stack = createNativeStackNavigator<BookingStackParamList>();

export const BookingStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#0D0D0D' },
    }}
  >
    <Stack.Screen name="BookingList" component={BookingListScreen} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
    <Stack.Screen name="FindParking" component={FindParkingScreen} />
  </Stack.Navigator>
);
