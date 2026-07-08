import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/common';
import { borderRadius, colors, spacing } from '@/theme';
import type { UserNotification } from '@/types/models';
import {
  formatNotificationTimestamp,
  getNotificationColor,
  getNotificationIcon,
} from '@/utils/notifications';

interface Props {
  notification: UserNotification;
  onPress: () => void;
  onDelete: () => void;
}

export const NotificationCard = ({ notification, onPress, onDelete }: Props) => (
  <Card style={[styles.card, !notification.isRead && styles.unread]}>
    <Pressable style={styles.content} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: getNotificationColor(notification.priority) }]}>
        <AppText color={colors.neutral.white}>{getNotificationIcon(notification.type)}</AppText>
      </View>
      <View style={styles.body}>
        <AppText style={!notification.isRead && styles.bold}>{notification.title}</AppText>
        <AppText color={colors.light.text.secondary} numberOfLines={2}>
          {notification.content.slice(0, 100)}
        </AppText>
        <AppText color={colors.light.text.secondary} variant="caption">
          {formatNotificationTimestamp(notification.createdAt)}
        </AppText>
      </View>
    </Pressable>
    <Button title="Delete" variant="ghost" onPress={onDelete} />
  </Card>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  unread: {
    backgroundColor: colors.primary[50],
  },
  content: {
    flexDirection: 'row',
    gap: spacing.md,
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
    gap: spacing.xs,
  },
  bold: {
    fontWeight: '700',
  },
});

