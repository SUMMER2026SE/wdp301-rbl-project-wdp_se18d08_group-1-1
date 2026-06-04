import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Bell, Inbox, Sparkles } from "lucide-react";
import { PRIORITY_META, PRIORITY } from "../../../lib/notifications/types";

const FILTER_OPTIONS = ["ALL", PRIORITY.INFO, PRIORITY.SUCCESS, PRIORITY.WARNING, PRIORITY.ERROR, PRIORITY.SYSTEM];

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LiveFeed({ notifications, onMarkRead, onMarkAllRead }) {
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) =>
      priorityFilter === "ALL" ? true : item.priority === priorityFilter,
    );
  }, [notifications, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-yellow-400 uppercase tracking-[0.2em] font-semibold">
            Phát sóng trực tiếp
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Dòng thông báo thời gian thực
          </h2>
          <p className="mt-2 text-sm text-gray-400 max-w-2xl">
            Lọc theo mức độ ưu tiên, xem trạng thái đã đọc và đánh dấu tất cả là đã đọc.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
          >
            <CheckCircle2 size={16} />
            Đánh dấu tất cả là đã đọc
          </button>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-900/80 px-4 py-3 text-sm text-gray-300 ring-1 ring-white/10">
            <Bell size={16} />
            <span>{filteredNotifications.length} thông báo</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const meta = PRIORITY_META[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => setPriorityFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                priorityFilter === option
                  ? "bg-yellow-500/20 text-yellow-100 ring-1 ring-yellow-400/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/5"
              }`}
            >
              {option === "ALL" ? "Tất cả" : meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-gray-400">
            <Inbox className="mx-auto mb-3 text-yellow-300" size={34} />
            <p className="text-lg font-semibold text-white">Chưa có thông báo phù hợp</p>
            <p className="mt-2 text-sm text-gray-500">Kiểm tra lại bộ lọc hoặc tạo thông báo mới từ tab Soạn.</p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const meta = PRIORITY_META[item.priority] || PRIORITY_META.INFO;
            return (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}> 
                        <Circle size={8} />
                        {meta.label}
                      </span>
                      {!item.read && (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Chưa đọc
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    <p className="text-gray-300 leading-7">{item.message}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <span className="text-xs uppercase tracking-[0.24em] text-gray-500">
                      {formatTime(item.createdAt)}
                    </span>
                    <span className="rounded-full bg-gray-900/80 px-3 py-1 text-xs text-gray-400">
                      {item.target?.type === "all"
                        ? "Toàn hệ thống"
                        : item.target?.type === "multi"
                        ? "Nhiều khách hàng"
                        : "Một khách hàng"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id)}
                      className="inline-flex items-center justify-center rounded-2xl bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
                    >
                      <Sparkles size={14} />
                      Đánh dấu đã đọc
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
