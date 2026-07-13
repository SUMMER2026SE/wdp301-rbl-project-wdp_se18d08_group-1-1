import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { config } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type { AuthStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';
import { isValidEmail, isValidPassword } from '@/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }: Props) => {
  const { login, googleLogin, isLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    androidClientId: config.googleAndroidClientId || undefined,
    clientId: config.googleClientId,
    iosClientId: config.googleIosClientId || undefined,
    webClientId: config.googleClientId,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

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

  const completeGoogleLogin = useCallback(
    async (idToken: string) => {
      setGoogleSubmitting(true);
      setError('');
      try {
        await googleLogin({ idToken });
        toast.showSuccess('Welcome back');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Google login failed.');
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [googleLogin, toast],
  );

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      return;
    }

    const idToken = googleResponse.params.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      setError('Google did not return an ID token. Check OAuth client IDs.');
      return;
    }

    void completeGoogleLogin(idToken);
  }, [completeGoogleLogin, googleResponse]);

  const handleGoogleLogin = async () => {
    setError('');
    if (!config.googleClientId) {
      setError('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    await promptGoogleAsync();
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
        disabled={!googleRequest || googleSubmitting}
        loading={googleSubmitting}
        title="Continue with Google"
        variant="outline"
        onPress={handleGoogleLogin}
      />
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
