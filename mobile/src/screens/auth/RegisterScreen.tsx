import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('Name is required.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim();
      await authService.register({
        username: username.trim(),
        name: username.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: 'customer',
      });
      await authService.sendOTP({ email: normalizedEmail });
      navigation.navigate('VerifyOTP', { email: normalizedEmail, purpose: 'register' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <AppText variant="h1">Create Account</AppText>
      <Input label="Name" onChangeText={setUsername} placeholder="Full name" value={username} />
      <Input keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      <Input keyboardType="phone-pad" label="Phone" onChangeText={setPhone} value={phone} />
      <Input label="Password" onChangeText={setPassword} secureTextEntry value={password} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Register" onPress={handleSubmit} />
      <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};
