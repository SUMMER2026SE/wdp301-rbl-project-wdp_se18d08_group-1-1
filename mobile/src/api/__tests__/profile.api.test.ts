import { apiClient } from '@/services/api/client';

import { fetchProfile } from '../profile.api';

describe('profile API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the authenticated profile and maps its name and avatar', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        username: 'anh_khoi_8847',
        email: 'khoinha0910@gmail.com',
        role: 'customer',
        profile: {
          firstName: 'User',
          lastName: '',
          avatar: 'https://example.com/avatar.jpg',
        },
      },
    });

    await expect(fetchProfile()).resolves.toMatchObject({
      _id: 'user-1',
      fullName: 'User',
      avatar: 'https://example.com/avatar.jpg',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/profile');
  });

  it('rejects a successful response without profile data', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValue({ success: true });

    await expect(fetchProfile()).rejects.toThrow('Invalid profile data.');
  });
});
