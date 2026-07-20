import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { policiesService } from '@/services/api/policies';
import { subscriptionsService } from '@/services/api/subscriptions';
import { SubscriptionCheckoutScreen } from '../SubscriptionCheckoutScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/booking/ParkingMap2D', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ParkingMap2D: ({ onToggleSlot }: { onToggleSlot: (slot: { floorId: string; slotCode: string }) => void }) => (
      <Pressable accessibilityLabel="Select A1" onPress={() => onToggleSlot({ floorId: 'floor-1', slotCode: 'A1' })}>
        <Text>A1 map space</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/services/ParkingFloorService', () => ({
  __esModule: true,
  default: {
    getParkingFloors: jest.fn().mockResolvedValue([{ _id: 'floor-1', floorNumber: 1, name: 'Floor 1' }]),
    getSlotsByFloor: jest.fn().mockResolvedValue([{ id: 'slot-1', floorId: 'floor-1', slotCode: 'A1', status: 'available' }]),
  },
}));
jest.mock('@/services/api/vehicles', () => ({
  vehiclesService: { getMyVehicles: jest.fn().mockResolvedValue({ success: true, data: [{ _id: 'vehicle-1' }] }) },
}));
jest.mock('@/services/api/wallet', () => ({
  walletService: { getWallet: jest.fn().mockResolvedValue({ success: true, data: { balance: 1_000_000 } }) },
}));
jest.mock('@/services/api/subscriptions', () => ({
  subscriptionsService: {
    getPackages: jest.fn(),
    getMembership: jest.fn(),
    payWithWallet: jest.fn(),
    createPayment: jest.fn(),
  },
}));
jest.mock('@/services/api/policies', () => ({
  policiesService: { getPolicyBySlug: jest.fn(), acceptPolicy: jest.fn() },
}));

const missingPolicies = [
  { policyId: 'policy-1', slug: 'booking-policy', title: 'Booking policy', versionNumber: 1 },
  { policyId: 'policy-2', slug: 'privacy-policy', title: 'Privacy policy', versionNumber: 2 },
];

const scrollToBottom = (screen: ReturnType<typeof render>) => {
  fireEvent.scroll(screen.getByTestId('policy-scroll'), {
    nativeEvent: {
      contentOffset: { y: 700 },
      contentSize: { height: 900, width: 320 },
      layoutMeasurement: { height: 300, width: 320 },
    },
  });
};

describe('SubscriptionCheckoutScreen policy retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (subscriptionsService.getPackages as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ _id: 'package-1', name: 'Monthly VIP', type: 'monthly', price: 100_000, isActive: true }],
    });
    (subscriptionsService.getMembership as jest.Mock).mockResolvedValue({ success: true, data: null });
    (subscriptionsService.payWithWallet as jest.Mock)
      .mockRejectedValueOnce({ data: { code: 'POLICY_ACCEPTANCE_REQUIRED', data: { missingPolicies } } })
      .mockResolvedValueOnce({ success: true });
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

  it('accepts every policy and retries wallet payment exactly once', async () => {
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const screen = render(
      <SubscriptionCheckoutScreen
        navigation={navigation as never}
        route={{ key: 'SubscriptionCheckout', name: 'SubscriptionCheckout', params: { packageId: 'package-1' } } as never}
      />,
    );

    await screen.findByText('Monthly VIP');
    fireEvent.press(screen.getByLabelText('Select A1'));
    fireEvent.press(screen.getByText('Confirm purchase'));

    expect(await screen.findByText('Booking policy')).toBeTruthy();
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    expect(await screen.findByText('Privacy policy')).toBeTruthy();
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    await waitFor(() => expect(subscriptionsService.payWithWallet).toHaveBeenCalledTimes(2));
    expect(navigation.navigate).toHaveBeenCalledWith('Membership');
    expect(policiesService.acceptPolicy).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate wallet payments while the first request is in flight', async () => {
    (subscriptionsService.payWithWallet as jest.Mock).mockReset().mockResolvedValue({ success: true });
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const screen = render(
      <SubscriptionCheckoutScreen
        navigation={navigation as never}
        route={{ key: 'SubscriptionCheckout', name: 'SubscriptionCheckout', params: { packageId: 'package-1' } } as never}
      />,
    );

    await screen.findByText('Monthly VIP');
    fireEvent.press(screen.getByLabelText('Select A1'));
    const button = screen.getByText('Confirm purchase');
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    await waitFor(() => expect(subscriptionsService.payWithWallet).toHaveBeenCalledTimes(1));
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });

  it('does not retry payment when policy acceptance fails', async () => {
    (policiesService.acceptPolicy as jest.Mock).mockRejectedValue(new Error('Acceptance failed'));
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const screen = render(
      <SubscriptionCheckoutScreen
        navigation={navigation as never}
        route={{ key: 'SubscriptionCheckout', name: 'SubscriptionCheckout', params: { packageId: 'package-1' } } as never}
      />,
    );

    await screen.findByText('Monthly VIP');
    fireEvent.press(screen.getByLabelText('Select A1'));
    fireEvent.press(screen.getByText('Confirm purchase'));
    await screen.findByText('Booking policy');
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    expect(await screen.findByText('Acceptance failed')).toBeTruthy();
    expect(subscriptionsService.payWithWallet).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
