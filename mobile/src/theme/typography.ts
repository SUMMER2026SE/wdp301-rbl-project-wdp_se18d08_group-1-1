import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: undefined,
});

export const typography = {
  h1: {
    fontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 0,
  } satisfies TextStyle,
  h2: {
    fontFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0,
  } satisfies TextStyle,
  h3: {
    fontFamily,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  } satisfies TextStyle,
  body1: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  } satisfies TextStyle,
  body2: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
  } satisfies TextStyle,
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0,
  } satisfies TextStyle,
  button: {
    fontFamily,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0,
  } satisfies TextStyle,
};
