import { useState, useCallback, useEffect } from 'react';
import { Bell, CheckCheck, Search, ChevronDown } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from '../../components/notifications/NotificationItem';

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PARKING', label: 'Đỗ xe' },
  { value: 'WALLET', label: 'Ví' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'BOOKING', label: 'Đặt chỗ' },
  { value: 'ACCOUNT', label: 'Tài khoản' },
  { value: 'SYSTEM', label: 'Hệ thống' },
];

export default function CustomerNotifications() {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filters,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateFilters,
  } = useNotifications({ autoFetch: true, limit: 20 });

  const [searchInput, setSearchInput] = useState('');

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }, [searchInput, updateFilters]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-gray-100 px-4 py-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Thông báo</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 transition-colors"
            >
              <CheckCheck size={16} />
              Đọc tất cả
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateFilters({ type: f.value || null })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  (filters.type || '') === f.value
                    ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-yellow-500/30 transition-colors"
              />
            </div>
          </form>
        </div>

        {/* Notification List */}
        <div className="space-y-2">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm mt-4">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Bell size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">Chưa có thông báo nào</p>
              <p className="text-gray-600 text-sm mt-1">Thông báo mới sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}

              {hasMore && (
                <button
                  onClick={fetchMore}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Tải thêm
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
