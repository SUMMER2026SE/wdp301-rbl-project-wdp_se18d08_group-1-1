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

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await googleLogin({ idToken });
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Google sign-in failed. Please try again.';
      alert('Google sign-in failed', message);
    } finally {
      setGoogleLoading(false);
    }
  }, [alert, googleLogin]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;

    const idToken =
      googleResponse.authentication?.idToken ??
      (googleResponse.params as Record<string, string>)?.id_token;

    if (idToken) {
      void handleGoogleLogin(idToken);
    } else {
      alert('Error', 'Unable to retrieve the Google ID token.');
    }
  }, [alert, googleResponse, handleGoogleLogin]);

  const handleLogin = async () => {
    const trimEmail = email.trim();
    const trimPass = password.trim();

    if (!trimEmail || !trimPass) {
      alert('Missing information', 'Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: trimEmail, password: trimPass });
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Sign-in failed. Please try again.';
      alert('Sign-in failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <LinearGradient
        colors={['#080808', '#111111', '#161208']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.cornerGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoGlow}>
              <Image resizeMode="contain" source={LogoImg} style={styles.logoImg} />
            </View>
            <Text style={styles.brandName}>VALO</Text>
            <Text style={styles.brandSub}>PARKING</Text>
            <View style={styles.badge}>
              <Ionicons name="flash" size={11} color={COLORS.gold} />
              <Text style={styles.badgeText}>Smart Parking Platform</Text>
            </View>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={[COLORS.gold, 'transparent']}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.cardTopLine}
            />
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardSub}>Welcome back to VALO Parking</Text>

            <Field
              autoCapitalize="none"
              icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
              keyboardType="email-address"
              placeholder="Your email"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />

            <Field
              icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Password"
              returnKeyType="done"
              rightIcon={
                <Ionicons
                  name={passwordHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              }
              secureTextEntry={passwordHidden}
              value={password}
              onChangeText={setPassword}
              onRightIconPress={() => setPasswordHidden((value) => !value)}
              onSubmitEditing={handleLogin}
            />

            <Pressable
              style={({ pressed }) => [styles.forgotRow, pressed && styles.pressed]}
              onPress={() => navigation?.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.loginBtn, loading && styles.disabled]}
              onPress={handleLogin}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={styles.loginBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Sign in</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textInverse} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!googleRequest || googleLoading}
              style={[styles.googleBtn, (!googleRequest || googleLoading) && styles.disabled]}
              onPress={() => googlePromptAsync()}
            >
              {googleLoading ? (
                <ActivityIndicator color="#444" size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <Pressable
              style={({ pressed }) => [styles.registerRow, pressed && styles.pressed]}
              onPress={() => navigation?.navigate('Register')}
            >
              <Text style={styles.registerText}>New to VALO? </Text>
              <Text style={[styles.registerText, styles.registerLink]}>Create account</Text>
            </Pressable>
          </View>

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
