import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { colors } from '@/theme';
import { isValidPassword } from '@/utils/validation';

export const ChangePasswordScreen = () => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!isValidPassword(newPassword)) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await profileService.changePassword({ currentPassword, newPassword, confirmPassword });
      toast.showSuccess('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Password change failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">Change Password</AppText>
      <Input label="Current password" onChangeText={setCurrentPassword} secureTextEntry value={currentPassword} />
      <Input label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} />
      <Input label="Confirm password" onChangeText={setConfirmPassword} secureTextEntry value={confirmPassword} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Update Password" onPress={handleSubmit} />
    </Screen>
  );
};
