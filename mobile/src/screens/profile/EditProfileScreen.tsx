import { useEffect, useMemo, useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useProfileData } from '@/hooks/useProfileData';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { colors, spacing } from '@/theme';
import { validateDateOfBirth, validateVietnamesePhone } from '@/utils/profileValidation';

export const EditProfileScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfileData();
  const imageUpload = useImageUpload();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setPhone(profile.phone || '');
    setDob(profile.dob ? profile.dob.slice(0, 10) : '');
    setGender(profile.gender || '');
    setAvatar(profile.avatar || undefined);
  }, [profile]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (phone && !validateVietnamesePhone(phone)) next.phone = 'Phone number must be 10 digits starting with 0.';
    const dobResult = validateDateOfBirth(dob);
    if (!dobResult.valid && dobResult.error) next.dob = dobResult.error;
    if (gender && !['male', 'female', 'other'].includes(gender)) next.gender = 'Use male, female, or other.';
    return next;
  }, [dob, gender, phone]);

  const hasChanges = Boolean(
    profile &&
      (firstName !== (profile.firstName || '') ||
        lastName !== (profile.lastName || '') ||
        phone !== (profile.phone || '') ||
        dob !== (profile.dob ? profile.dob.slice(0, 10) : '') ||
        gender !== (profile.gender || '')),
  );

  const uploadAvatar = async () => {
    const asset = await imageUpload.pickSquareImage();
    if (!asset) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const processed = await imageUpload.processAvatar(asset.uri);
      const response = await profileService.uploadAvatar({
        uri: processed.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setAvatar(response.data.avatarUrl);
      await refreshUser();
      toast.showSuccess('Avatar updated');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0 || !hasChanges) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dob: dob.trim() || undefined,
        gender: gender.trim() as 'male' | 'female' | 'other' | undefined,
      });
      toast.showSuccess('Profile updated');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable contentStyle={{ gap: spacing.lg }}>
      <AppText variant="h1">Edit Profile</AppText>
      <ProfileAvatar editable name={user?.username || 'Customer'} size={96} uri={avatar} onPress={uploadAvatar} />
      <Button loading={uploadingAvatar || imageUpload.loading} title="Change Avatar" variant="outline" onPress={uploadAvatar} />
      <Input editable={!profileLoading} label="First name" onChangeText={setFirstName} value={firstName} />
      <Input editable={!profileLoading} label="Last name" onChangeText={setLastName} value={lastName} />
      <Input error={errors.phone} keyboardType="phone-pad" label="Phone" onChangeText={setPhone} value={phone} />
      <Input error={errors.dob} label="Date of birth" onChangeText={setDob} placeholder="YYYY-MM-DD" value={dob} />
      <Input error={errors.gender} label="Gender" onChangeText={setGender} placeholder="male, female, other" value={gender} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button disabled={!hasChanges || Object.keys(errors).length > 0} loading={loading} title="Save" onPress={handleSubmit} />
    </Screen>
  );
};
