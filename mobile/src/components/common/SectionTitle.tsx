import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { COLORS, FONT_SIZES } from '@/constants/theme';

export interface SectionTitleProps {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function SectionTitle({ children, color = COLORS.textMuted, style }: SectionTitleProps) {
  return <Text style={[styles.title, { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
