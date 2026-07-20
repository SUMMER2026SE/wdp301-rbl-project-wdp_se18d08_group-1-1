import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { policiesService } from '@/services/api/policies';
import bookingService from '@/services/BookingService';
import { CreateBookingScreen } from '../CreateBookingScreen';

const mockBookingContext = {
  availableSlots: [{
    id: 'slot-1',
    floorId: 'floor-1',
    floorName: 'Floor 1',
    slotCode: 'A1',
    status: 'available',
  }],
  parkingFloors: [{ _id: 'floor-1', floorNumber: 1, name: 'Floor 1' }],
  services: [],
  walletBalance: 1_000_000,
  isLoading: false,
  error: '',
  fetchWalletBalance: jest.fn().mockResolvedValue(undefined),
  fetchBookings: jest.fn().mockResolvedValue(undefined),
  fetchParkingFloors: jest.fn().mockResolvedValue(undefined),
  fetchServices: jest.fn().mockResolvedValue(undefined),
  getAvailableSlots: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/hooks/useBooking', () => ({ useBooking: () => mockBookingContext }));
jest.mock('@/components/booking/ParkingMap2D', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ParkingMap2D: ({ onSelectSlot }: { onSelectSlot: (slot: unknown) => void }) => (
      <Pressable accessibilityLabel="Select A1" onPress={() => onSelectSlot(mockBookingContext.availableSlots[0])}>
        <Text>A1 map space</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/services/BookingService', () => ({
  __esModule: true,
  default: {
    getActiveSessions: jest.fn(),
    getActiveHolds: jest.fn(),
    quoteBulkBooking: jest.fn(),
    createBookingHold: jest.fn(),
    createBulkBooking: jest.fn(),
    releaseBookingHold: jest.fn(),
    normalizeBooking: jest.fn(),
  },
}));
jest.mock('@/services/ParkingFloorService', () => ({
  __esModule: true,
  default: { getSlotsByFloor: jest.fn().mockResolvedValue([{ id: 'slot-1', slotNumber: 'A1', status: 'available' }]) },
}));
jest.mock('@/services/api/vehicles', () => ({
  vehiclesService: {
    getMyVehicles: jest.fn().mockResolvedValue({
      success: true,
      data: [{ _id: 'vehicle-1', id: 'vehicle-1', licensePlate: '30A-12345', status: 'approved', isDefault: true }],
    }),
  },
}));
jest.mock('@/services/api/subscriptions', () => ({
  subscriptionsService: {
    getPackages: jest.fn().mockResolvedValue({ success: true, data: [] }),
    getMembership: jest.fn().mockResolvedValue({ success: true, data: null }),
  },
}));
jest.mock('@/services/api/wallet', () => ({
  walletService: { getWallet: jest.fn().mockResolvedValue({ success: true, data: { balance: 1_000_000 } }) },
}));
jest.mock('@/services/api/policies', () => ({
  policiesService: { getPolicyBySlug: jest.fn(), acceptPolicy: jest.fn() },
}));

const policyError = {
  data: {
    code: 'POLICY_ACCEPTANCE_REQUIRED',
    data: {
      missingPolicies: [
        { policyId: 'policy-1', slug: 'booking-policy', title: 'Booking policy', versionNumber: 1 },
        { policyId: 'policy-2', slug: 'privacy-policy', title: 'Privacy policy', versionNumber: 2 },
      ],
    },
  },
};

const scrollToBottom = (screen: ReturnType<typeof render>) => {
  fireEvent.scroll(screen.getByTestId('policy-scroll'), {
    nativeEvent: {
      contentOffset: { y: 700 },
      contentSize: { height: 900, width: 320 },
      layoutMeasurement: { height: 300, width: 320 },
    },
  });
};

describe('CreateBookingScreen policy retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bookingService.getActiveSessions as jest.Mock).mockResolvedValue({ data: [] });
    (bookingService.getActiveHolds as jest.Mock).mockResolvedValue({ data: [] });
    (bookingService.quoteBulkBooking as jest.Mock).mockResolvedValue({ data: { grandTotal: 10_000 } });
    (bookingService.createBookingHold as jest.Mock)
      .mockResolvedValueOnce({ data: { _id: 'hold-1' } })
      .mockResolvedValueOnce({ data: { _id: 'hold-2' } });
    (bookingService.createBulkBooking as jest.Mock)
      .mockRejectedValueOnce(policyError)
      .mockResolvedValueOnce({ data: { bookings: [{ _id: 'booking-1' }] } });
    (bookingService.releaseBookingHold as jest.Mock).mockResolvedValue({ success: true });
    (bookingService.normalizeBooking as jest.Mock).mockReturnValue({ _id: 'booking-1' });
    (policiesService.getPolicyBySlug as jest.Mock).mockImplementation(async (slug: string) => ({
      success: true,
      data: {
        _id: slug === 'booking-policy' ? 'policy-1' : 'policy-2',
        slug,
        title: slug === 'booking-policy' ? 'Booking policy' : 'Privacy policy',
        category: 'parking_rules',
        content: `${slug} content `.repeat(80),
      },
    }));
    (policiesService.acceptPolicy as jest.Mock).mockResolvedValue({ success: true });
  });

  it('releases the failed hold, accepts every policy, and retries booking once', async () => {
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), getParent: jest.fn() };
    const screen = render(
      <CreateBookingScreen
        navigation={navigation as never}
        route={{ key: 'CreateBooking', name: 'CreateBooking', params: { selectedFloorId: 'floor-1', selectedSlotCode: 'A1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Confirm booking').props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(screen.getByLabelText('Confirm booking'));

    expect(await screen.findByText('Booking policy')).toBeTruthy();
    await waitFor(() => expect(bookingService.releaseBookingHold).toHaveBeenCalledWith('hold-1'));
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    expect(await screen.findByText('Privacy policy')).toBeTruthy();
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    await waitFor(() => expect(bookingService.createBulkBooking).toHaveBeenCalledTimes(2));
    expect(bookingService.createBookingHold).toHaveBeenCalledTimes(2);
    expect(bookingService.releaseBookingHold).toHaveBeenCalledTimes(1);
    expect(policiesService.acceptPolicy).toHaveBeenNthCalledWith(1, 'policy-1');
    expect(policiesService.acceptPolicy).toHaveBeenNthCalledWith(2, 'policy-2');
  });

  it('prevents duplicate booking creation while the first request is in flight', async () => {
    (bookingService.createBookingHold as jest.Mock).mockReset().mockResolvedValue({ data: { _id: 'hold-1' } });
    (bookingService.createBulkBooking as jest.Mock).mockReset().mockResolvedValue({
      data: { bookings: [{ _id: 'booking-1' }] },
    });
    const screen = render(
      <CreateBookingScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), getParent: jest.fn() } as never}
        route={{ key: 'CreateBooking', name: 'CreateBooking', params: { selectedFloorId: 'floor-1', selectedSlotCode: 'A1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Confirm booking').props.accessibilityState?.disabled).toBe(false));
    const button = screen.getByLabelText('Confirm booking');
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    await waitFor(() => expect(bookingService.createBookingHold).toHaveBeenCalledTimes(1));
    expect(bookingService.createBulkBooking).toHaveBeenCalledTimes(1);
  });
});
