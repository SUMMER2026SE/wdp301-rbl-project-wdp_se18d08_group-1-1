import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginUser, loginWithGoogle } from '../api/auth.api';
import { useAuth } from '../contexts/AuthContext';
import { GOOGLE_CLIENT_ID } from '../constants/env';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

// Completes the auth session when redirected back from browser
WebBrowser.maybeCompleteAuthSession();

// ─── Logo image ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LogoImg = require('../../assets/logo.png') as number;

// ─── Google colour icon (SVG paths as Text workaround via emoji not used) ─────
function GoogleIcon() {
  return (
    <View style={googleIconStyles.wrap}>
      <View style={[googleIconStyles.quad, { backgroundColor: '#4285F4' }]} />
      <View style={[googleIconStyles.quad, { backgroundColor: '#34A853' }]} />
      <View style={[googleIconStyles.quad, { backgroundColor: '#FBBC05' }]} />
      <View style={[googleIconStyles.quad, { backgroundColor: '#EA4335' }]} />
    </View>
  );
}

const googleIconStyles = StyleSheet.create({
  wrap: { width: 20, height: 20, flexWrap: 'wrap', flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  quad: { width: 10, height: 10 },
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface LoginScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
}


// ─── Reusable input field ─────────────────────────────────────────────────────
function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  rightIcon,
  onRightIconPress,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, focused ? styles.fieldFocused : styles.fieldDefault]}>
      <View style={styles.fieldIconLeft}>{icon}</View>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={COLORS.gold}
      />
      {rightIcon && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRightIconPress}
          style={styles.fieldIconRight}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {rightIcon}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const [_googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken =
        googleResponse.authentication?.idToken ??
        (googleResponse.params as Record<string, string>)?.id_token;
      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        Alert.alert('Lỗi', 'Không lấy được Google ID token.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const { user, accessToken } = await loginWithGoogle(idToken);
      login(user, accessToken);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      Alert.alert('Đăng nhập Google thất bại', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimEmail = email.trim();
    const trimPass = password.trim();
    if (!trimEmail || !trimPass) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const { user, accessToken } = await loginUser(trimEmail, trimPass);
      login(user, accessToken);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.';
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#080808', '#111111', '#161208']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative gold corner glow */}
      <View style={styles.cornerGlow} pointerEvents="none" />

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
          {/* ── Hero / Branding ───────────────────────────────── */}
          <View style={styles.hero}>
            {/* Logo with glow ring */}
            <View style={styles.logoGlow}>
              <Image source={LogoImg} style={styles.logoImg} resizeMode="contain" />
            </View>

            <Text style={styles.brandName}>VALO</Text>
            <Text style={styles.brandSub}>PARKING</Text>

            <View style={styles.badge}>
              <Ionicons name="flash" size={11} color={COLORS.gold} />
              <Text style={styles.badgeText}>Smart Parking Platform</Text>
            </View>
          </View>

          {/* ── Form Card ─────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Gold top line accent */}
            <LinearGradient
              colors={[COLORS.gold, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopLine}
            />

            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSub}>Chào mừng trở lại VALO Parking</Text>

            <Field
              icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Email của bạn"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Field
              icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={passwordHidden}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              rightIcon={
                <Ionicons
                  name={passwordHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              }
              onRightIconPress={() => setPasswordHidden(v => !v)}
            />

            {/* Forgot password */}
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.forgotRow, pressed && { opacity: 0.5 }]}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </Pressable>

            {/* Login button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleLogin}
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Đăng nhập</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textInverse} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc đăng nhập với</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={googleLoading}
              onPress={() => googlePromptAsync()}
              style={[styles.googleBtn, googleLoading && { opacity: 0.6 }]}
            >
              {googleLoading ? (
                <ActivityIndicator color="#444" size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <Pressable
              onPress={() => navigation?.navigate('Register')}
              style={({ pressed }) => [styles.registerRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <Text style={[styles.registerText, styles.registerLink]}>Đăng ký ngay</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>© 2026 VALO Parking · All rights reserved</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.gold,
    opacity: 0.05,
  },

  // ── Hero ────────────────────────────────────────────────
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  logoGlow: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.3)',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10,
  },
  logoImg: { width: 78, height: 78 },
  brandName: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 10,
    marginTop: SPACING.xs,
  },
  brandSub: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 6,
    marginTop: -4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Card ────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  // ── Field ───────────────────────────────────────────────
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    height: 52,
  },
  fieldDefault: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
  },
  fieldFocused: {
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  fieldIconLeft: { width: 32, alignItems: 'center' },
  fieldIconRight: { width: 32, alignItems: 'center' },
  fieldInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    paddingVertical: 0,
  },

  // ── Forgot ──────────────────────────────────────────────
  forgotRow: { alignSelf: 'flex-end', marginBottom: SPACING.md, marginTop: 2 },
  forgotText: { color: COLORS.gold, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // ── Login button ────────────────────────────────────────
  loginBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: 4 },
  loginBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  loginBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Divider ─────────────────────────────────────────────
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginHorizontal: SPACING.sm },

  // ── Google button ────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  googleBtnText: {
    color: '#3c4043',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },

  // ── Register ────────────────────────────────────────────
  registerRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 },
  registerText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  registerLink: { color: COLORS.gold, fontWeight: '700' },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xl,
    opacity: 0.5,
  },
});
