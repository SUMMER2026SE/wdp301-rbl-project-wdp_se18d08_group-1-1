import { Platform } from 'react-native';

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#102A43',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#102A43',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
};
