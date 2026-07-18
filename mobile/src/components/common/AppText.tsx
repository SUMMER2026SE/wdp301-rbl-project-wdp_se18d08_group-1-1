import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

import { colors, typography } from '@/theme';

type TextVariant = keyof typeof typography;

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
}

export const AppText = ({
  variant = 'body1',
  color = colors.light.text.primary,
  style,
  ...props
}: AppTextProps) => (
  <RNText style={[styles.base, typography[variant], { color }, style]} {...props} />
);

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
