import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/common';
import { borderRadius, colors, spacing } from '@/theme';
import type { UserNotification } from '@/types/models';
import { getNotificationColor, getNotificationIcon } from '@/utils/notifications';

interface Props {
  notification: UserNotification | null;
  onDismiss: () => void;
  onPress: () => void;
}

export const InAppNotificationBanner = ({ notification, onDismiss, onPress }: Props) => {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <Pressable style={styles.overlay} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: getNotificationColor(notification.priority) }]}>
        <AppText color={notification.priority === 'ERROR' ? colors.neutral.white : colors.light.text.inverse}>
          {getNotificationIcon(notification.type)}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText style={styles.title}>{notification.title}</AppText>
        <AppText color={colors.light.text.secondary} numberOfLines={2}>
          {notification.content}
        </AppText>
      </View>
      <Pressable accessibilityRole="button" onPress={onDismiss}>
        <AppText color={colors.light.text.secondary}>x</AppText>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl,
    zIndex: 50,
  },
  icon: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
});

