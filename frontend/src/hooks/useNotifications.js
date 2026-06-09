import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketProvider';
import * as notifApi from '../services/notificationService';

/**
 * useNotifications — custom hook for notification state management.
 *
 * Returns:
 *  - notifications, unreadCount, loading, error, hasMore
 *  - fetchMore(), markAsRead(id), markAllAsRead(), deleteNotification(id), refresh()
 *
 * Listens to socket 'notification:new' and 'notification:unreadCount' events.
 */
export function useNotifications({ autoFetch = true, limit = 20 } = {}) {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({ type: null, isRead: null, search: '' });
  const isMounted = useRef(true);

  // ── Fetch unread count ──
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await notifApi.getUnreadCount();
      if (res.ok && isMounted.current) {
        setUnreadCount(res.data?.data?.count ?? 0);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async (pageNum = 1, replace = true) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      if (isMounted.current) setLoading(true);

      const params = { page: pageNum, limit };
      if (filters.type) params.type = filters.type;
      if (filters.isRead !== null && filters.isRead !== undefined && filters.isRead !== '')
        params.isRead = filters.isRead;
      if (filters.search) params.search = filters.search;

      const res = await notifApi.getNotifications(params);

      if (res.ok && isMounted.current) {
        const newNotifs = res.data?.data || [];
        const pagination = res.data?.pagination || {};

        if (replace) {
          setNotifications(newNotifs);
        } else {
          setNotifications((prev) => [...prev, ...newNotifs]);
        }

        setPage(pageNum);
        setHasMore(pageNum < (pagination.totalPages || 1));
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filters, limit]);

  // ── Initial fetch ──
  useEffect(() => {
    isMounted.current = true;
    if (autoFetch) {
      fetchNotifications(1, true);
      fetchUnreadCount();
    }
    return () => {
      isMounted.current = false;
    };
  }, [autoFetch, fetchNotifications, fetchUnreadCount]);

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;

    const handleNew = (notification) => {
      setNotifications((prev) => [
        {
          _id: `temp_${Date.now()}`,
          notificationId: notification._id,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          priority: notification.priority,
          metadata: notification.metadata,
          isRead: false,
          readAt: null,
          createdAt: notification.createdAt || new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnreadCount((count) => count + 1);
    };

    const handleUnreadCount = (data) => {
      setUnreadCount(data.count ?? 0);
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:unreadCount', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:unreadCount', handleUnreadCount);
    };
  }, [socket]);

  // ── Actions ──
  const fetchMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, false);
    }
  }, [loading, hasMore, page, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          (n.notificationId || n._id) === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await notifApi.markAsRead(notificationId);
    } catch {
      // Revert on failure — re-fetch
      fetchNotifications(1, true);
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await notifApi.markAllAsRead();
    } catch {
      fetchNotifications(1, true);
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.filter((n) => (n.notificationId || n._id) !== notificationId)
      );

      const was = notifications.find((n) => (n.notificationId || n._id) === notificationId);
      if (was && !was.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      await notifApi.deleteNotification(notificationId);
    } catch {
      fetchNotifications(1, true);
      fetchUnreadCount();
    }
  }, [notifications, fetchNotifications, fetchUnreadCount]);

  const refresh = useCallback(() => {
    fetchNotifications(1, true);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
    setHasMore(true);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    filters,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    updateFilters,
  };
}
