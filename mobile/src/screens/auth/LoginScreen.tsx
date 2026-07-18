import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type { AuthStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const { login, isLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      toast.showSuccess('Welcome back');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed.');
    }
  };

  return (
    <Screen scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="h1">VALO Parking</AppText>
        <AppText color={colors.light.text.secondary}>Sign in to manage your parking account.</AppText>
      </View>
      <Input
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <Input
        label="Password"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      {error ? <AppText color={colors.error.main}>{error}</AppText> : null}
      <Button loading={isLoading} title="Login" onPress={handleSubmit} />
      <Button
        title="Forgot Password?"
        variant="ghost"
        onPress={() => navigation.navigate('ForgotPassword')}
      />
      <Button
        title="Create Account"
        variant="outline"
        onPress={() => navigation.navigate('Register')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    gap: spacing.sm,
  },
});
