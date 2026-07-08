import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import { profileService } from '@/services/api/profile';
import { colors } from '@/theme';
import { calculatePasswordStrength } from '@/utils/profileValidation';

export const ChangePasswordScreen = () => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
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
      <AppText color={colors.light.text.secondary}>Strength: {calculatePasswordStrength(newPassword)}</AppText>
      <Input label="Confirm password" onChangeText={setConfirmPassword} secureTextEntry value={confirmPassword} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Update Password" onPress={handleSubmit} />
    </Screen>
  );
};
