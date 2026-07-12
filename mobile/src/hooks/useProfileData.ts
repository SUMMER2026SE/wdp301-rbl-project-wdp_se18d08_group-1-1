import { useCallback, useEffect, useState } from 'react';

import { profileService } from '@/services/api/profile';
import type { UpdateProfileRequest } from '@/types/api';
import type { UserProfile } from '@/types/models';

type ProfilePayload = UserProfile | { profile?: UserProfile | null };

const extractProfile = (payload?: ProfilePayload | null) => {
  if (!payload) return null;
  if ('profile' in payload) return (payload.profile || null) as UserProfile | null;
  return payload as UserProfile;
};

export const useProfileData = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await profileService.getProfile();
      setProfile(extractProfile(response.data as ProfilePayload));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    const response = await profileService.updateProfile(data);
    setProfile(extractProfile(response.data as ProfilePayload));
    return response;
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, fetchProfile, updateProfile };
};
