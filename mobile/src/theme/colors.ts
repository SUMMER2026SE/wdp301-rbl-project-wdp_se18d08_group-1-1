export const palette = {
  primary: {
    50: '#EAF5FF',
    100: '#CFE8FF',
    500: '#1476D4',
    600: '#0F63B7',
    700: '#0B4C8D',
  },
  secondary: {
    50: '#EAFBF6',
    100: '#C9F4E6',
    500: '#0E9F6E',
    600: '#087F5B',
  },
  success: { light: '#DFF7EA', main: '#1F9D55', dark: '#157347' },
  warning: { light: '#FFF4CC', main: '#D99A00', dark: '#9A6B00' },
  error: { light: '#FFE3E3', main: '#D64545', dark: '#A61B1B' },
  neutral: {
    white: '#FFFFFF',
    50: '#F8FAFC',
    100: '#EEF2F6',
    200: '#D9E2EC',
    400: '#829AB1',
    600: '#52606D',
    800: '#243B53',
    900: '#102A43',
    black: '#000000',
  },
};

export const colors = {
  ...palette,
  light: {
    background: palette.neutral[50],
    surface: palette.neutral.white,
    text: {
      primary: palette.neutral[900],
      secondary: palette.neutral[600],
      inverse: palette.neutral.white,
    },
    border: palette.neutral[200],
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
