import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/navigation/types';
import { colors } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const { register, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

    try {
      await register({
        username: username.trim(),
        name: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: 'customer',
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
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
      <Button loading={isLoading} title="Register" onPress={handleSubmit} />
      <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};
