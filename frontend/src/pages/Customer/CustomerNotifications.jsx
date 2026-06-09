import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "../../components/notifications/NotificationItem";

export default function CustomerNotifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    fetchMore,
    markAsRead,
    deleteNotification,
    refresh,
  } = useNotifications({ autoFetch: true, limit: 20 });

  return (
    <div className="bg-[#0D0D0D] text-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">Thông báo của tôi</h1>
        <p className="text-sm text-gray-400 mb-6">Chưa đọc: {unreadCount}</p>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <ul className="space-y-4">
          {notifications.map((n) => (
            <NotificationItem
              key={n.notificationId || n._id}
              notification={n}
              onRead={() => markAsRead(n.notificationId || n._id)}
              onDelete={() => deleteNotification(n.notificationId || n._id)}
            />
          ))}
          {loading && <li className="text-center py-4 text-gray-400">Đang tải...</li>}
        </ul>
        {hasMore && !loading && (
          <button
            onClick={fetchMore}
            className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
          >
            Tải thêm
          </button>
        )}
        <button
          onClick={refresh}
          className="mt-4 w-full py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
        >
          Làm mới
        </button>
      </div>
    </div>
  );
}
