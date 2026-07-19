import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, typography } from '@/theme';

import { AppText } from './AppText';

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const Avatar = ({ uri, name = 'User', size = 64, style }: AvatarProps) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={[styles.base, { borderRadius: size / 2, height: size, width: size }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ borderRadius: size / 2, height: size, width: size }} />
      ) : (
        <AppText style={styles.initials}>{initials || 'U'}</AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    ...typography.h3,
    color: colors.primary[600],
  },
});
