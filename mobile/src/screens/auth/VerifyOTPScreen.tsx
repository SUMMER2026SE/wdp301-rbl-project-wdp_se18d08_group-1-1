import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors } from '@/theme';
import { isValidOtp } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOTP'>;

export const VerifyOTPScreen = ({ navigation, route }: Props) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!isValidOtp(otp)) {
      setError('Enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.verifyResetOTP({ email: route.params.email, otp });
      navigation.navigate('ResetPassword', { email: route.params.email, otp });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">Verify OTP</AppText>
      <Input keyboardType="number-pad" label="OTP" maxLength={6} onChangeText={setOtp} value={otp} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Verify" onPress={handleSubmit} />
    </Screen>
  );
};
