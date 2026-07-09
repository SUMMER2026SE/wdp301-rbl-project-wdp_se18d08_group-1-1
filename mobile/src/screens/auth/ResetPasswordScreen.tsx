import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useToast } from '@/hooks/useToast';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors } from '@/theme';
import { isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!isValidPassword(newPassword)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({
        email: route.params.email,
        otp: route.params.otp,
        newPassword,
      });
      toast.showSuccess('Password reset', 'Please login with your new password.');
      navigation.popToTop();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">New Password</AppText>
      <Input label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} />
      <Input
        label="Confirm password"
        onChangeText={setConfirmPassword}
        secureTextEntry
        value={confirmPassword}
      />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Reset Password" onPress={handleSubmit} />
    </Screen>
  );
};
