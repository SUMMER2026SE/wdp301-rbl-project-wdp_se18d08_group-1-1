import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS } from '../constants/theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'gold' | 'outline';
}

export default function PrimaryButton({
  title,
  loading = false,
  disabled,
  variant = 'gold',
  style,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={isDisabled}
        style={[styles.base, styles.outline, isDisabled && styles.disabled, style as object]}
        {...props}
      >
        <Text style={styles.outlineText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[styles.base, isDisabled && styles.disabled, style as object]}
      {...props}
    >
      <LinearGradient
        colors={isDisabled ? ['#5A5230', '#3D3820'] : COLORS.gradientGold}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textInverse} size="small" />
        ) : (
          <Text style={styles.goldText}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.xl,
    height: 58,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  outlineText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.55,
  },
});
