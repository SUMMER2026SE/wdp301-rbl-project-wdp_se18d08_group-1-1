
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Input } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { config } from '@/config/env';

import { useAuth } from '@/hooks/useAuth';
import { useAppAlert } from '@/contexts/AppAlertContext';

import { GOOGLE_CLIENT_ID } from '../../constants/env';

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


  const redirectUri = AuthSession.makeRedirectUri();
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
  });

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await googleLogin({ idToken });
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      alert('Đăng nhập Google thất bại', message);
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
      alert('Lỗi', 'Không lấy được Google ID token.');
    }
  }, [alert, googleResponse, handleGoogleLogin]);

  const handleLogin = async () => {
    const trimEmail = email.trim();
    const trimPass = password.trim();

    if (!trimEmail || !trimPass) {
      alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: trimEmail, password: trimPass });
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Đăng nhập thất bại. Vui lòng thử lại.';
      alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
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
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <LinearGradient
        colors={['#080808', '#111111', '#161208']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
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
}

const googleIconStyles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 20,
    overflow: 'hidden',
    width: 20,
  },
  quad: { height: 10, width: 10 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808' },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  cornerGlow: {
    backgroundColor: COLORS.gold,
    borderRadius: 130,
    height: 260,
    opacity: 0.05,
    position: 'absolute',
    right: -80,
    top: -80,
    width: 260,
  },
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  logoGlow: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 54,
    borderWidth: 1.5,
    height: 108,
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    width: 108,
  },
  logoImg: { height: 78, width: 78 },
  brandName: {
    color: COLORS.gold,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 10,
    marginTop: SPACING.xs,
  },
  brandSub: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    letterSpacing: 6,
    marginTop: -4,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  cardTopLine: {
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: SPACING.xs,
  },
  cardSub: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.lg,
  },
  fieldWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 52,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  fieldDefault: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
  },
  fieldFocused: {
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  fieldIconLeft: { alignItems: 'center', width: 32 },
  fieldIconRight: { alignItems: 'center', width: 32 },
  fieldInput: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: 0,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: 2,
  },
  forgotText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  loginBtn: { borderRadius: RADIUS.lg, marginTop: 4, overflow: 'hidden' },
  loginBtnGrad: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: 52,
  },
  loginBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: SPACING.md,
  },
  dividerLine: { backgroundColor: COLORS.border, flex: 1, height: 1 },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginHorizontal: SPACING.sm,
  },
  googleBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e0e0e0',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: SPACING.md,
    minHeight: 50,
  },
  googleBtnText: {
    color: '#3c4043',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  registerLink: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xl,
    opacity: 0.5,
    textAlign: 'center',
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.65 },
});
