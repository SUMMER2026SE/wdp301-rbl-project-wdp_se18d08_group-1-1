import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { registerUser } from '../../api/auth.api';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegisterScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

// ─── Reusable field ────────────────────────────────────────────────────────────
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
  autoCapitalize?: 'none' | 'sentences' | 'words';
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passHidden, setPassHidden] = useState(true);
  const [confirmHidden, setConfirmHidden] = useState(true);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    const u = username.trim();
    const e = email.trim();
    const p = password.trim();
    const c = confirmPassword.trim();

    if (!u || !e || !p || !c) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (p !== c) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng kiểm tra lại mật khẩu xác nhận.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(u, e, p, c);
      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập.',
        [{ text: 'Đăng nhập', onPress: () => navigation?.navigate('Login') }],
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại.';
      Alert.alert('Đăng ký thất bại', message);
    } finally {
      setLoading(false);
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

      {/* Decorative glow */}
      <View style={styles.cornerGlow} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <Ionicons name="person-add" size={28} color={COLORS.gold} />
            </View>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để trải nghiệm VALO Parking</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={[COLORS.gold, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopLine}
            />

            <Field
              icon={<Ionicons name="person-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Tên đăng nhập"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <Field
              icon={<Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Email của bạn"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />

            <Field
              icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={passHidden}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              rightIcon={
                <Ionicons
                  name={passHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              }
              onRightIconPress={() => setPassHidden(v => !v)}
            />

            <Field
              icon={<Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={confirmHidden}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              rightIcon={
                <Ionicons
                  name={confirmHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              }
              onRightIconPress={() => setConfirmHidden(v => !v)}
            />

            {/* Register button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleRegister}
              style={[styles.registerBtn, loading && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textInverse} size="small" />
                ) : (
                  <Text style={styles.registerBtnText}>Đăng ký ngay</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login link */}
            <Pressable
              onPress={() => navigation?.navigate('Login')}
              style={({ pressed }) => [styles.loginLink, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.loginLinkText}>
                Đã có tài khoản?{' '}
                <Text style={styles.loginLinkHighlight}>Đăng nhập</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <Text style={{ color: COLORS.gold }}>Điều khoản dịch vụ</Text>
            {' '}và{' '}
            <Text style={{ color: COLORS.gold }}>Chính sách bảo mật</Text>
            {' '}của VALO Parking.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808' },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  cornerGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.gold,
    opacity: 0.06,
  },

  backBtn: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.08)',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },

  // Field
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    height: 52,
    paddingHorizontal: SPACING.md,
  },
  fieldDefault: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceElevated },
  fieldFocused: { borderColor: COLORS.gold, backgroundColor: '#1C1C1A' },
  fieldIconLeft: { marginRight: SPACING.sm },
  fieldIconRight: { marginLeft: SPACING.sm },
  fieldInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZES.md },

  // Register button
  registerBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.xs },
  registerBtnGradient: { height: 52, justifyContent: 'center', alignItems: 'center' },
  registerBtnText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginHorizontal: SPACING.sm },

  // Login link
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  loginLinkHighlight: { color: COLORS.gold, fontWeight: '600' },

  footerNote: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
});
