import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { borderRadius, colors } from '@/theme';

import { AppText } from './AppText';

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export const IconButton = ({ icon, label, style, ...props }: IconButtonProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    {...props}
  >
    <AppText style={styles.icon}>{icon}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
