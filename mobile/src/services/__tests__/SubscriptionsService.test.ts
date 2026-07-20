import { apiClient } from '../api/client';
import { subscriptionsService } from '../api/subscriptions';

describe('subscriptionsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads and preserves the complete signed membership QR payload', async () => {
    const payload = 'VALO_MEMBERSHIP_ACCOUNT:1:user-1:signature';
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        available: true,
        membershipStatus: 'active',
        payload,
        reason: null,
      },
    });

    const response = await subscriptionsService.getMembershipQr();

    expect(get).toHaveBeenCalledWith('/subscriptions/membership/qr');
    expect(response.data?.payload).toBe(payload);
  });
});
