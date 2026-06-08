import { Clock3, Trash2, Play } from "lucide-react";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ScheduledList({ scheduled, onCancel }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-yellow-400 uppercase tracking-[0.2em] font-semibold">
            Lịch trình
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Danh sách thông báo đã lên lịch
          </h2>
          <p className="mt-2 text-sm text-gray-400 max-w-2xl">
            Xem các thông báo chưa gửi và quản lý thời gian xuất bản cho từng chiến dịch.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {scheduled.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-gray-400">
            <Clock3 className="mx-auto mb-3 text-yellow-300" size={34} />
            <p className="text-lg font-semibold text-white">Không có thông báo đã lên lịch</p>
            <p className="mt-2 text-sm text-gray-500">Tạo lịch gửi mới trong tab Soạn để quản lý thông báo theo thời gian.</p>
          </div>
        ) : (
          scheduled.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-700/80 bg-gray-950/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-gray-400">
                      <Clock3 size={12} />
                      {formatTime(item.sendAt)}
                    </span>
                    <span className="rounded-full bg-gray-900/80 px-3 py-1 text-xs text-gray-400">
                      {item.target?.type === "all"
                        ? "Toàn hệ thống"
                        : item.target?.type === "multi"
                        ? "Nhiều khách hàng"
                        : "Một khách hàng"}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="text-gray-300 leading-7">{item.message}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onCancel(item.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/15"
                  >
                    <Trash2 size={16} />
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
                  >
                    <Play size={16} />
                    Xem trước
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
