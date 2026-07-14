import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    setError('');
    if (!normalizedName) {
      setError('Please enter your name.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        username: normalizedName,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
        role: 'customer',
      });
      await authService.sendOTP({ email: normalizedEmail });
      navigation.navigate('VerifyOTP', { email: normalizedEmail, purpose: 'register' });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <AppText variant="h1">Create account</AppText>
      <Input label="Name" onChangeText={setName} placeholder="Full name" value={name} />
      <Input
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      <Input keyboardType="phone-pad" label="Phone" onChangeText={setPhone} value={phone} />
      <Input label="Password" onChangeText={setPassword} secureTextEntry value={password} />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={loading} title="Register" onPress={handleSubmit} />
      <Button title="Back to login" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};

export default RegisterScreen;
