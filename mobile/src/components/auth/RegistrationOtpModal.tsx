import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

type RegistrationOtpModalProps = {
  email: string;
  visible: boolean;
  verifying: boolean;
  resending: boolean;
  error: string;
  onCancel: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
};

export const RegistrationOtpModal = ({
  email,
  visible,
  verifying,
  resending,
  error,
  onCancel,
  onVerify,
  onResend,
}: RegistrationOtpModalProps) => {
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!visible) {
      setOtp('');
      setCooldown(0);
      return;
    }

    const timer = cooldown > 0 ? setInterval(() => setCooldown((value) => value - 1), 1000) : undefined;
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown, visible]);

  useEffect(() => {
    if (visible) {
      const focusTimer = setTimeout(() => inputRefs.current[0]?.focus(), 250);
      return () => clearTimeout(focusTimer);
    }

    return undefined;
  }, [visible]);

  const updateOtp = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    const next = otp.split('');

    if (digits.length > 1) {
      digits.slice(0, 6).split('').forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      const nextIndex = Math.min(index + digits.length, 5);
      setOtp(next.slice(0, 6).join(''));
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    next[index] = digits;
    setOtp(next.slice(0, 6).join(''));
    if (digits && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (cooldown > 0 || resending) return;
    setOtp('');
    setCooldown(60);
    onResend();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons color={COLORS.textInverse} name="mail-outline" size={28} />
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.description}>
            We sent a 6-digit verification code to <Text style={styles.email}>{email}</Text>. Enter it below to activate your VALO account.
          </Text>

          <View style={styles.otpRow}>
            {Array.from({ length: 6 }, (_, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                autoComplete="one-time-code"
                blurOnSubmit={false}
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1}
                selectionColor={COLORS.gold}
                style={[styles.otpInput, index === 2 && styles.otpGap]}
                value={otp[index] || ''}
                onChangeText={(value) => updateOtp(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.resendText}>Didn't get the code?</Text>
          <Pressable disabled={cooldown > 0 || resending} onPress={handleResend}>
            <Text style={[styles.resendLink, (cooldown > 0 || resending) && styles.disabledText]}>
              {resending ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>

          <Pressable
            disabled={otp.length !== 6 || verifying}
            style={[styles.verifyButton, (otp.length !== 6 || verifying) && styles.buttonDisabled]}
            onPress={() => onVerify(otp)}
          >
            {verifying ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={styles.verifyText}>Verify & continue</Text>}
          </Pressable>
          <Pressable disabled={verifying} style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.78)', flex: 1, justifyContent: 'center', padding: SPACING.lg },
  card: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.goldDark, borderRadius: RADIUS.xl, borderWidth: 1, maxWidth: 420, padding: SPACING.lg, width: '100%' },
  iconCircle: { alignItems: 'center', backgroundColor: COLORS.gold, borderRadius: RADIUS.md, height: 56, justifyContent: 'center', marginBottom: SPACING.md, width: 56 },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, fontWeight: '800', marginBottom: SPACING.sm },
  description: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, lineHeight: 20, textAlign: 'center' },
  email: { color: COLORS.textPrimary, fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginVertical: SPACING.lg },
  otpInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: COLORS.borderLight, borderRadius: RADIUS.sm, borderWidth: 1, color: COLORS.textPrimary, fontSize: FONT_SIZES.xl, height: 50, textAlign: 'center', width: 40 },
  otpGap: { marginRight: SPACING.sm },
  error: { color: COLORS.error, fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm, textAlign: 'center' },
  resendText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm },
  resendLink: { color: COLORS.gold, fontSize: FONT_SIZES.sm, fontWeight: '700', marginTop: 2 },
  disabledText: { color: COLORS.textMuted },
  verifyButton: { alignItems: 'center', backgroundColor: COLORS.gold, borderRadius: RADIUS.lg, justifyContent: 'center', marginTop: SPACING.lg, minHeight: 50, width: '100%' },
  buttonDisabled: { opacity: 0.55 },
  verifyText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '800' },
  cancelButton: { alignItems: 'center', minHeight: 42, justifyContent: 'center', marginTop: SPACING.xs, width: '100%' },
  cancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
});
