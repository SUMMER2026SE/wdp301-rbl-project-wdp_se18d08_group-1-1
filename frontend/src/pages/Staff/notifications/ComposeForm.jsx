import { useMemo, useState } from "react";
import { Bell, Calendar, FileText, Send, Users, User } from "lucide-react";
import { PRIORITY, PRIORITY_META, TARGET_OPTIONS } from "../../../lib/notifications/types";

const sampleCustomers = [
  { id: "cust_001", name: "Nguyễn Văn A" },
  { id: "cust_002", name: "Trần Thị B" },
  { id: "cust_003", name: "Lê Văn C" },
  { id: "cust_004", name: "Phạm Thị D" },
];

export default function ComposeForm({ templates, onSend, onSchedule }) {
  const [target, setTarget] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState(PRIORITY.INFO);
  const [sendAt, setSendAt] = useState("");

  const recipientLabel = useMemo(() => {
    if (target === "single") return "Một Khách Hàng";
    if (target === "multi") return "Nhiều Khách Hàng";
    return "Toàn hệ thống";
  }, [target]);

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority);
  };

  const buildTarget = () => {
    if (target === "single") {
      return { type: "single", value: selectedCustomers[0] || "unknown" };
    }
    if (target === "multi") {
      return { type: "multi", value: selectedCustomers.join(", ") };
    }
    return { type: "all" };
  };

  const handleSubmit = (mode) => {
    const payload = {
      title: title || "Thông báo mới",
      message: message || "Nội dung thông báo chưa được nhập.",
      priority,
      target: buildTarget(),
      channels: ["In-app"],
    };

    if (mode === "schedule" && sendAt) {
      onSchedule({ ...payload, sendAt });
      return;
    }

    onSend(payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-center gap-3 text-yellow-400">
            <Bell size={18} />
            <h2 className="text-lg font-semibold text-white">Soạn thông báo</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Đối tượng</label>
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
              >
                {TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(target === "single" || target === "multi") && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-gray-200">Chọn khách hàng</p>
                <div className="mt-3 space-y-2">
                  {sampleCustomers.map((customer) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:border-yellow-500/30"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedCustomers((prev) => [...prev, customer.id]);
                          } else {
                            setSelectedCustomers((prev) => prev.filter((id) => id !== customer.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-500 bg-white/5 text-yellow-400"
                      />
                      <span>{customer.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Tiêu đề</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Nhập tiêu đề thông báo"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Mức độ ưu tiên</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
                >
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => templates[0] && applyTemplate(templates[0])}
                className="inline-flex items-center gap-2 rounded-3xl bg-yellow-500/15 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/20"
              >
                <FileText size={16} />
                Áp dụng từ Mẫu
              </button>
              <span className="text-sm text-gray-400">Chọn mẫu để tải nhanh nội dung sẵn có.</span>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Nội dung</label>
              <textarea
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập nội dung thông báo"
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-100 outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-center gap-3 text-yellow-400">
            <FileText size={18} />
            <h2 className="text-lg font-semibold text-white">Nội dung mẫu</h2>
          </div>
          <div className="grid gap-3">
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-gray-200 hover:border-yellow-400/40"
              >
                <p className="font-semibold text-white">{template.name}</p>
                <p className="mt-1 text-xs text-gray-400 truncate">{template.title}</p>
              </button>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-200">Lên lịch gửi</p>
                <p className="text-xs text-gray-500">Chọn thời điểm để gửi thông báo sau.</p>
              </div>
              <Calendar size={18} className="text-yellow-300" />
            </div>
            <input
              type="datetime-local"
              value={sendAt}
              onChange={(event) => setSendAt(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
            />
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 text-gray-300">
              <Users size={16} />
              <p className="text-sm">Đối tượng hiện tại: {recipientLabel}</p>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <User size={16} />
              <p className="text-sm">
                Khách hàng đã chọn: {selectedCustomers.length || "0"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Bell size={16} />
              <p className="text-sm">Mức ưu tiên: {PRIORITY_META[priority].label}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleSubmit("send")}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              <Send size={16} />
              Gửi ngay
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("schedule")}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100 hover:border-yellow-400 hover:text-yellow-100"
            >
              <Calendar size={16} />
              Lên lịch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
