import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';

export type BookingModalVariant = 'success' | 'error' | 'warning' | 'info';

interface BookingActionModalProps {
  visible: boolean;
  variant: BookingModalVariant;
  title: string;
  message?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  children?: ReactNode;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}

const VARIANT_CONFIG: Record<BookingModalVariant, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: COLORS.success },
  error: { icon: 'close-circle', color: COLORS.error },
  warning: { icon: 'alert-circle', color: COLORS.warning },
  info: { icon: 'information-circle', color: COLORS.staffBlue },
};

export const BookingActionModal = ({
  visible,
  variant,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  destructive = false,
  loading = false,
  children,
  onPrimary,
  onSecondary,
  onClose,
}: BookingActionModalProps) => {
  const config = VARIANT_CONFIG[variant];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconGlow, { backgroundColor: `${config.color}18` }]}>
            <Ionicons name={config.icon} size={76} color={config.color} />
          </View>
          <Text style={[styles.title, { color: destructive ? COLORS.error : COLORS.gold }]}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.button, destructive ? styles.dangerButton : styles.primaryButton]}
              onPress={onPrimary}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              )}
            </TouchableOpacity>
            {secondaryLabel ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={loading}
                style={[styles.button, styles.secondaryButton]}
                onPress={onSecondary ?? onClose}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    width: '100%',
  },
  iconGlow: {
    alignItems: 'center',
    borderRadius: RADIUS.round,
    height: 92,
    justifyContent: 'center',
    marginBottom: SPACING.md,
    width: 92,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  actions: { gap: SPACING.sm, width: '100%' },
  button: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: SPACING.md,
  },
  primaryButton: { backgroundColor: COLORS.gold },
  dangerButton: { backgroundColor: COLORS.error },
  primaryText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  secondaryText: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: '600' },
});
