import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/common';
import { colors } from '@/theme';

interface Props {
  uri?: string;
  name: string;
  editable?: boolean;
  size?: number;
  onPress?: () => void;
}

export const ProfileAvatar = ({ uri, name, editable = false, size = 80, onPress }: Props) => (
  <Pressable disabled={!editable} style={{ height: size, width: size }} onPress={onPress}>
    <Avatar name={name} size={size} uri={uri} />
    {editable ? (
      <View style={styles.badge}>
        <AppText color={colors.light.text.inverse} variant="caption">+</AppText>
      </View>
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    bottom: 0,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 24,
  },
});

