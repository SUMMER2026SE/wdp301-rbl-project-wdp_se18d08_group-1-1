import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { useAppAlert } from '@/contexts/AppAlertContext';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/api/auth';
import { colors, spacing } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const { alert } = useAppAlert();
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

    if (!normalizedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.register({
        username: normalizedName,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone || undefined,
        password,
        role: 'customer',
      });

      alert('Account created', 'Please verify your email to continue.');
      navigation.navigate('VerifyOTP', { email: normalizedEmail, purpose: 'register' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable contentStyle={styles.content}>
      <AppText style={styles.title} variant="h1">
        Create account
      </AppText>
      <AppText color={colors.light.text.secondary} style={styles.subtitle}>
        Sign up to book parking and manage your VALO wallet.
      </AppText>

      <Input label="Name" onChangeText={setName} placeholder="Full name" value={name} />
      <Input
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <Input
        keyboardType="phone-pad"
        label="Phone"
        onChangeText={setPhone}
        placeholder="Phone number"
        value={phone}
      />
      <Input
        autoCapitalize="none"
        label="Password"
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        value={password}
      />

      {error ? (
        <AppText color={colors.error.main} style={styles.error} variant="body2">
          {error}
        </AppText>
      ) : null}

      <Button loading={loading} style={styles.submit} title="Create account" onPress={handleSubmit} />
      <Button
        disabled={loading}
        title="Already have an account? Sign in"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    marginBottom: -spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  error: {
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.sm,
  },
});