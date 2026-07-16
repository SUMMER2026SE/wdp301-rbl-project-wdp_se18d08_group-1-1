import { COLORS } from '@/constants/theme';

export const palette = {
  primary: {
    50: '#2A2518',
    100: '#3C3219',
    500: COLORS.gold,
    600: COLORS.goldLight,
    700: COLORS.goldDark,
  },
  secondary: {
    50: '#142331',
    100: '#19344C',
    500: COLORS.staffBlue,
    600: '#8BC9FF',
  },
  success: { light: '#173526', main: '#55C77A', dark: '#359A5B' },
  warning: { light: '#3A2D13', main: '#FFB84D', dark: '#E3A52B' },
  error: { light: '#3A1C20', main: COLORS.error, dark: '#DF4048' },
  neutral: {
    white: COLORS.textPrimary,
    50: COLORS.background,
    100: COLORS.surface,
    200: COLORS.border,
    400: COLORS.textMuted,
    600: COLORS.textSecondary,
    800: '#292C31',
    900: COLORS.textInverse,
    black: '#090A0C',
  },
};

export const colors = {
  ...palette,
  light: {
    background: COLORS.background,
    surface: COLORS.surface,
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
      inverse: COLORS.textInverse,
    },
    border: COLORS.border,
  },
  dark: {
    background: '#0B1220',
    surface: '#111827',
    text: {
      primary: palette.neutral.white,
      secondary: '#CBD5E1',
      inverse: palette.neutral[900],
    },
    border: '#243244',
  },
};
