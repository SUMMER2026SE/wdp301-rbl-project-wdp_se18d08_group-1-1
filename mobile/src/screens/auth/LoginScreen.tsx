import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { config } from '@/config/env';
import { useAppAlert } from '@/contexts/AppAlertContext';
import { useAuth } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/navigation/types';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const { login, googleLogin, isLoading } = useAuth();
  const { alert } = useAppAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    androidClientId: config.googleAndroidClientId || undefined,
    clientId: config.googleClientId,
    iosClientId: config.googleIosClientId || undefined,
    webClientId: config.googleClientId,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const handleLogin = async () => {
    const trimEmail = email.trim();
    const trimPass = password.trim();

    if (!trimEmail || !trimPass) {
      alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: trimEmail, password: trimPass });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.';
      alert('Đăng nhập thất bại', message);
    } finally {
      setSubmitting(false);
    }
  };

  const completeGoogleLogin = useCallback(
    async (idToken: string) => {
      setGoogleSubmitting(true);
      try {
        await googleLogin({ idToken });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        alert('Đăng nhập Google thất bại', message);
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [alert, googleLogin],
  );

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;

    const idToken =
      googleResponse.params?.id_token ?? googleResponse.authentication?.idToken;

    if (idToken) {
      void completeGoogleLogin(idToken);
    } else {
      alert('Lỗi', 'Không lấy được Google ID token.');
    }
  }, [alert, completeGoogleLogin, googleResponse]);

  const handleGooglePress = async () => {
    if (!config.googleClientId) {
      alert('Lỗi cấu hình', 'Thiếu EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    await promptGoogleAsync();
  };

  const loading = submitting || isLoading;

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Đăng nhập</AppText>

        <Input
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button disabled={loading} loading={loading} title="Đăng nhập" onPress={handleLogin} />

        <Button
          disabled={!googleRequest || googleSubmitting}
          loading={googleSubmitting}
          title="Tiếp tục với Google"
          variant="outline"
          onPress={handleGooglePress}
        />

        <Button
          title="Quên mật khẩu?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
        />

        <Button
          title="Tạo tài khoản"
          variant="outline"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default LoginScreen;
