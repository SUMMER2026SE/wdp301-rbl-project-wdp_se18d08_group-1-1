import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { borderRadius, colors, spacing, typography } from '@/theme';

import { AppText } from './AppText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardTypeOptions;
}

export const Input = ({
  label,
  error,
  containerStyle,
  style,
  accessibilityLabel,
  ...props
}: InputProps) => (
  <View style={[styles.container, containerStyle]}>
    {label ? (
      <AppText color={colors.light.text.secondary} style={styles.label} variant="body2">
        {label}
      </AppText>
    ) : null}
    <TextInput
      accessibilityLabel={accessibilityLabel || label || props.placeholder}
      autoCapitalize="none"
      placeholderTextColor={colors.neutral[400]}
      style={[styles.input, error && styles.inputError, style]}
      {...props}
    />
    {error ? (
      <AppText color={colors.error.main} style={styles.error} variant="caption">
        {error}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    ...typography.body1,
    backgroundColor: colors.neutral.white,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.light.text.primary,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  error: {
    marginTop: spacing.xs,
  },
});
