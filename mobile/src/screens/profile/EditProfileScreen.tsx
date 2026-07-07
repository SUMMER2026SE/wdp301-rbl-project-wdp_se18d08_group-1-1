import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { colors } from '@/theme';

export const EditProfileScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await profileService.updateProfile({
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
    <Screen scrollable>
      <AppText variant="h1">Edit Profile</AppText>
      <Input label="First name" onChangeText={setFirstName} value={firstName} />
      <Input label="Last name" onChangeText={setLastName} value={lastName} />
      <Input keyboardType="phone-pad" label="Phone" onChangeText={setPhone} value={phone} />
      <Input label="Date of birth" onChangeText={setDob} placeholder="YYYY-MM-DD" value={dob} />
      <Input label="Gender" onChangeText={setGender} placeholder="male, female, other" value={gender} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Save" onPress={handleSubmit} />
    </Screen>
  );
};
