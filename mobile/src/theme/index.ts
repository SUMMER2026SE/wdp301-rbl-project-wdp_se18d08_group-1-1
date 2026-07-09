import { useWindowDimensions } from 'react-native';

export { borderRadius } from './borderRadius';
export { colors, palette } from './colors';
export { shadows } from './shadows';
export { spacing } from './spacing';
export { typography } from './typography';

import { borderRadius } from './borderRadius';
import { colors } from './colors';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;

export const useResponsiveSize = () => {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 390, 0.9), 1.15);

  return (value: number) => Math.round(value * scale);
};
