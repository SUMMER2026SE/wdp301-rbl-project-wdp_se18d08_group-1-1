import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { borderRadius, colors, spacing, typography } from '@/theme';

import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const getVariantStyle = (variant: ButtonVariant) => {
  switch (variant) {
    case 'secondary':
      return {
        button: styles.secondary,
        text: styles.secondaryText,
      };
    case 'outline':
      return {
        button: styles.outline,
        text: styles.outlineText,
      };
    case 'ghost':
      return {
        button: styles.ghost,
        text: styles.ghostText,
      };
    case 'primary':
    default:
      return {
        button: styles.primary,
        text: styles.primaryText,
      };
  }
};

export const Button = ({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  ...props
}: ButtonProps) => {
  const variantStyle = getVariantStyle(variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.neutral.white : colors.primary[600]} />
      ) : (
        <AppText style={[styles.text, variantStyle.text, textStyle]}>{title}</AppText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    ...typography.button,
  },
  primary: {
    backgroundColor: colors.primary[500],
  },
  primaryText: {
    color: colors.neutral.white,
  },
  secondary: {
    backgroundColor: colors.secondary[500],
  },
  secondaryText: {
    color: colors.neutral.white,
  },
  outline: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.primary[500],
    borderWidth: 1,
  },
  outlineText: {
    color: colors.primary[600],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.primary[600],
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
