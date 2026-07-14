import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ScreenHeader } from '@/components/common';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { getNotificationId, NOTIFICATION_TYPES, type NotificationFilter } from '@/utils/notifications';

const filters: NotificationFilter[] = ['ALL', 'UNREAD', 'READ', ...NOTIFICATION_TYPES];

const FILTER_LABELS: Record<NotificationFilter, string> = {
  ALL: 'Tất cả',
  UNREAD: 'Chưa đọc',
  READ: 'Đã đọc',
  SYSTEM: 'Hệ thống',
  PARKING: 'Bãi xe',
  BOOKING: 'Đặt chỗ',
  WALLET: 'Ví',
  PAYMENT: 'Thanh toán',
  ACCOUNT: 'Tài khoản',
  PROMOTION: 'Ưu đãi',
  CAMERA: 'Camera',
  VIOLATION: 'Vi phạm',
};

export const NotificationsScreen = () => {
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    hasMore,
    refetch,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(filter);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      );
    }

    if (error) {
      return <ErrorState message={error} onRetry={refetch} />;
    }

    return (
      <EmptyState
        icon="notifications-outline"
        title="Không có thông báo"
        message="Các cập nhật về đặt chỗ, ví và tài khoản sẽ xuất hiện tại đây."
      />
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScreenHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã cập nhật'}
        right={
          unreadCount > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={styles.readAllButton}
              onPress={() => void markAllAsRead()}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={COLORS.gold} />
              <Text style={styles.readAllText}>Đọc hết</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FlatList
        contentContainerStyle={styles.list}
        data={notifications}
        keyExtractor={(item, index) => getNotificationId(item) || String(index)}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <ActivityIndicator color={COLORS.gold} style={styles.footerLoader} />
          ) : null
        }
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {filters.map((item) => {
              const active = filter === item;
              const label = item === 'UNREAD' && unreadCount > 0
                ? `${FILTER_LABELS[item]} ${unreadCount > 99 ? '99+' : unreadCount}`
                : FILTER_LABELS[item];

              return (
                <Pressable
                  key={item}
                  style={[styles.filter, active && styles.filterActive]}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={COLORS.gold} colors={[COLORS.gold]} />
        }
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
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  readAllButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: RADIUS.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
  },
  readAllText: {
    color: COLORS.gold,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  list: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  filters: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  filter: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  filterActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: COLORS.gold,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.gold,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
  },
});
