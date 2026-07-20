import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { Modal } from 'react-native';

import { policiesService } from '@/services/api/policies';
import { BookingPolicyModal } from '../BookingPolicyModal';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/services/api/policies', () => ({
  policiesService: {
    getPolicyBySlug: jest.fn(),
    acceptPolicy: jest.fn(),
  },
}));

const getPolicyBySlug = policiesService.getPolicyBySlug as jest.MockedFunction<typeof policiesService.getPolicyBySlug>;
const acceptPolicy = policiesService.acceptPolicy as jest.MockedFunction<typeof policiesService.acceptPolicy>;

const policy = {
  _id: '507f1f77bcf86cd799439011',
  slug: 'booking-policy',
  title: 'Booking policy',
  description: 'Important booking terms.',
  category: 'parking_rules' as const,
  content: 'Policy content '.repeat(80),
};

const PolicyQueueModal = BookingPolicyModal as unknown as ComponentType<{
  visible: boolean;
  policySlugs: string[];
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}>;

const scrollToBottom = (screen: ReturnType<typeof render>) => {
  fireEvent.scroll(screen.getByTestId('policy-scroll'), {
    nativeEvent: {
      contentOffset: { y: 620 },
      contentSize: { height: 900, width: 320 },
      layoutMeasurement: { height: 300, width: 320 },
    },
  });
};

describe('BookingPolicyModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPolicyBySlug.mockResolvedValue({ success: true, data: policy });
    acceptPolicy.mockResolvedValue({ success: true });
  });

  it('loads policy content from the requested slug', async () => {
    const screen = render(
      <BookingPolicyModal visible policySlug="booking-policy" onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(await screen.findByText('Booking policy')).toBeTruthy();
    expect(screen.getByText('Important booking terms.')).toBeTruthy();
    expect(getPolicyBySlug).toHaveBeenCalledWith('booking-policy');
  });

  it('requires scrolling before accepting, then accepts and confirms', async () => {
    const onConfirm = jest.fn();
    const screen = render(
      <BookingPolicyModal visible onClose={jest.fn()} onConfirm={onConfirm} />,
    );
    await screen.findByText('Booking policy');

    fireEvent.press(screen.getByText('Read to continue'));
    expect(acceptPolicy).not.toHaveBeenCalled();

    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    await waitFor(() => expect(acceptPolicy).toHaveBeenCalledWith(policy._id));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('closes without accepting when cancelled', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const screen = render(
      <BookingPolicyModal visible onClose={onClose} onConfirm={onConfirm} />,
    );
    await screen.findByText('Booking policy');

    fireEvent.press(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(acceptPolicy).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a recoverable loading error', async () => {
    getPolicyBySlug.mockRejectedValueOnce(new Error('Policy service unavailable'));
    const screen = render(
      <BookingPolicyModal visible onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(await screen.findByText('Policy service unavailable')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Booking policy')).toBeTruthy();
    expect(getPolicyBySlug).toHaveBeenCalledTimes(2);
  });

  it('accepts every required policy before confirming once', async () => {
    const privacyPolicy = {
      ...policy,
      _id: '507f1f77bcf86cd799439012',
      slug: 'privacy-policy',
      title: 'Privacy policy',
    };
    getPolicyBySlug.mockImplementation(async (slug) => ({
      success: true,
      data: slug === privacyPolicy.slug ? privacyPolicy : policy,
    }));
    const onConfirm = jest.fn();
    const screen = render(
      <PolicyQueueModal
        visible
        policySlugs={[policy.slug, privacyPolicy.slug]}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await screen.findByText('Booking policy');
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    expect(await screen.findByText('Privacy policy')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    await waitFor(() => expect(acceptPolicy).toHaveBeenNthCalledWith(1, policy._id));
    await waitFor(() => expect(acceptPolicy).toHaveBeenNthCalledWith(2, privacyPolicy._id));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks header close and Android back while acceptance is pending', async () => {
    let resolveAcceptance!: (value: { success: boolean }) => void;
    acceptPolicy.mockReturnValue(new Promise((resolve) => { resolveAcceptance = resolve; }));
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const screen = render(
      <BookingPolicyModal visible onClose={onClose} onConfirm={onConfirm} />,
    );
    await screen.findByText('Booking policy');
    scrollToBottom(screen);
    fireEvent.press(screen.getByText('I agree'));

    fireEvent.press(screen.getByLabelText('Close policy'));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).not.toHaveBeenCalled();

    resolveAcceptance({ success: true });
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('keeps the modal open and prevents duplicate requests when acceptance fails', async () => {
    acceptPolicy.mockRejectedValue(new Error('Acceptance failed'));
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const screen = render(
      <BookingPolicyModal visible onClose={onClose} onConfirm={onConfirm} />,
    );
    await screen.findByText('Booking policy');
    scrollToBottom(screen);
    const accept = screen.getByText('I agree');
    fireEvent.press(accept);
    fireEvent.press(accept);

    expect(await screen.findByText('Acceptance failed')).toBeTruthy();
    expect(acceptPolicy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
