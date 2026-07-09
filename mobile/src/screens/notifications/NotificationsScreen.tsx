import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText, Button, LoadingSpinner } from '@/components/common';
import { Screen } from '@/components/layout/Screen';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { borderRadius, colors, spacing } from '@/theme';
import { getNotificationId, NOTIFICATION_TYPES, type NotificationFilter } from '@/utils/notifications';

const filters: NotificationFilter[] = ['ALL', 'UNREAD', 'READ', ...NOTIFICATION_TYPES];

export const NotificationsScreen = () => {
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refetch,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(filter);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="h1">Notifications</AppText>
        {unreadCount > 0 ? <Button title="Read all" variant="outline" onPress={markAllAsRead} /> : null}
      </View>
      <FlatList
        ListEmptyComponent={
          loading ? <LoadingSpinner /> : <AppText color={colors.light.text.secondary}>{error || 'No notifications.'}</AppText>
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable
                key={item}
                style={[styles.filter, filter === item && styles.filterActive]}
                onPress={() => setFilter(item)}
              >
                <AppText color={filter === item ? colors.neutral.white : colors.light.text.primary} variant="caption">
                  {item === 'UNREAD' && unreadCount > 99 ? 'UNREAD 99+' : item === 'UNREAD' ? `UNREAD ${unreadCount}` : item}
                </AppText>
              </Pressable>
            ))}
          </View>
        }
        data={notifications}
        keyExtractor={(item, index) => getNotificationId(item) || String(index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const id = getNotificationId(item);
          return (
            <NotificationCard
              notification={item}
              onDelete={() => void deleteNotification(id)}
              onPress={() => void markAsRead(id)}
            />
          );
        }}
        onEndReached={loadMore}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filter: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});

