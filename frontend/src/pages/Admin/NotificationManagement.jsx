import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  FileText,
  Globe,
  Inbox,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { useSocket } from "../../contexts/SocketProvider";
import { DEFAULT_TEMPLATES } from "../../lib/notifications/types";
import * as notifApi from "../../services/notificationService";

const TABS = [
  { key: "live", label: "Live feed", icon: Bell },
  { key: "compose", label: "Gửi thông báo", icon: Send },
  { key: "rules", label: "Luật tự động", icon: Zap },
  { key: "templates", label: "Mẫu", icon: FileText },
];

const PRIORITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_BADGE = {
  INFO: "bg-sky-50 text-sky-700 border-sky-200",
  LOW: "bg-slate-50 text-slate-700 border-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200",
};

const TARGET_TYPES = [
  { value: "ALL", label: "Tất cả" },
  { value: "ROLE", label: "Theo vai trò" },
  { value: "USER", label: "Người dùng cụ thể" },
];

const ROLE_OPTIONS = ["admin", "staff", "customer"];

const defaultForm = {
  title: "",
  content: "",
  priority: "INFO",
  targetType: "ALL",
  targetRoles: ["customer"],
  targetUsers: "",
  channels: ["IN_APP"],
  expiresInHours: "",
};

function formatDate(value) {
  if (!value) return "Không có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeNotification(item) {
  return {
    id: item._id || item.id,
    title: item.title || "Không có tiêu đề",
    content: item.content || item.message || "",
    priority: item.priority || "INFO",
    targetType: item.targetType || "ALL",
    channels: item.channels || ["IN_APP"],
    createdAt: item.createdAt || item.sentAt,
    read: Boolean(item.readAt || item.isRead),
  };
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default function NotificationManagement() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("live");
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [autoRules, setAutoRules] = useState([]);
  const [templates] = useState(DEFAULT_TEMPLATES);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const unreadCount = useMemo(
    () => liveNotifications.filter((item) => !item.read).length,
    [liveNotifications]
  );

  const stats = useMemo(
    () => ({
      total: liveNotifications.length,
      unread: unreadCount,
      urgent: liveNotifications.filter((item) => item.priority === "URGENT").length,
      rules: autoRules.filter((rule) => rule.enabled).length,
    }),
    [autoRules, liveNotifications, unreadCount]
  );

  const fetchLiveFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await notifApi.getAdminHistory({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
        priority: priorityFilter === "ALL" ? undefined : priorityFilter,
      });
      const items = Array.isArray(data?.items)
        ? data.items
        : data?.notifications || data?.data || [];
      setLiveNotifications(items.map(normalizeNotification));
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, search]);

  const fetchAutoRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await notifApi.getAutoRules();
      const items = Array.isArray(data) ? data : data?.items || data?.rules || [];
      setAutoRules(items);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được luật thông báo.");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLiveFeed();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLiveFeed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAutoRules();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAutoRules]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleAdminNotification = (payload) => {
      setLiveNotifications((current) => [normalizeNotification(payload), ...current]);
    };
    socket.on("notification:admin:new", handleAdminNotification);
    return () => socket.off("notification:admin:new", handleAdminNotification);
  }, [socket]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleChannel = (channel) => {
    setForm((current) => {
      const nextChannels = current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel];
      return { ...current, channels: nextChannels.length ? nextChannels : ["IN_APP"] };
    });
  };

  const toggleRole = (role) => {
    setForm((current) => {
      const nextRoles = current.targetRoles.includes(role)
        ? current.targetRoles.filter((item) => item !== role)
        : [...current.targetRoles, role];
      return { ...current, targetRoles: nextRoles };
    });
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      targetType: form.targetType,
      channels: form.channels,
    };

    if (form.targetType === "ROLE") {
      payload.targetRoles = form.targetRoles;
    }

    if (form.targetType === "USER") {
      payload.targetUsers = form.targetUsers
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (form.expiresInHours) {
      payload.expiresAt = new Date(
        Date.now() + Number(form.expiresInHours) * 60 * 60 * 1000
      ).toISOString();
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await notifApi.createNotification(payload);
      setNotice("Đã gửi thông báo.");
      setForm(defaultForm);
      await fetchLiveFeed();
    } catch (err) {
      setError(err?.response?.data?.message || "Gửi thông báo thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (id) => {
    await notifApi.markAdminHistoryAsRead(id);
    setLiveNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllAsRead = async () => {
    await notifApi.markAllAdminHistoryAsRead();
    setLiveNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const removeNotification = async (id) => {
    await notifApi.deleteAdminHistoryNotification(id);
    setLiveNotifications((current) => current.filter((item) => item.id !== id));
  };

  const updateRule = async (rule, patch) => {
    const updated = await notifApi.updateAutoRule(rule._id || rule.id, patch);
    const nextRule = updated?.rule || updated;
    setAutoRules((current) =>
      current.map((item) =>
        (item._id || item.id) === (rule._id || rule.id) ? { ...item, ...nextRule } : item
      )
    );
  };

  const testRule = async (rule) => {
    await notifApi.testAutoRule(rule._id || rule.id);
    setNotice(`Đã gửi thử luật "${rule.name}".`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              Quản lý thông báo
            </h1>
          </div>
          <button
            type="button"
            onClick={fetchLiveFeed}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Inbox size={16} />
            Làm mới
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tổng thông báo" value={stats.total} icon={Bell} />
          <StatCard label="Chưa đọc" value={stats.unread} icon={Inbox} />
          <StatCard label="Khẩn cấp" value={stats.urgent} icon={Globe} />
          <StatCard label="Luật đang bật" value={stats.rules} icon={Zap} />
        </div>

        {(error || notice) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
                  activeTab === key
                    ? "border-slate-900 text-slate-950"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "live" && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tiêu đề hoặc nội dung"
                className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              />
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="ALL">Tất cả mức ưu tiên</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={!unreadCount}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Đánh dấu đã đọc
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <p className="p-6 text-sm text-slate-500">Đang tải thông báo...</p>
              ) : liveNotifications.length ? (
                <div className="divide-y divide-slate-100">
                  {liveNotifications.map((item) => (
                    <article
                      key={item.id}
                      className={`flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between ${
                        item.read ? "bg-white" : "bg-sky-50/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.INFO
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </span>
                          {!item.read && (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                              Mới
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-base font-semibold text-slate-950">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {item.content}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-400">
                          {item.targetType} · {item.channels.join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                            aria-label="Đánh dấu đã đọc"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNotification(item.id)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          aria-label="Xóa thông báo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-500">Chưa có thông báo.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === "compose" && (
          <form
            onSubmit={handleSendNotification}
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tiêu đề
                <input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Mức ưu tiên
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nội dung
              <textarea
                value={form.content}
                onChange={(event) => updateForm("content", event.target.value)}
                rows={5}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Đối tượng
                <select
                  value={form.targetType}
                  onChange={(event) => updateForm("targetType", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                >
                  {TARGET_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Hết hạn sau giờ
                <input
                  type="number"
                  min="1"
                  value={form.expiresInHours}
                  onChange={(event) => updateForm("expiresInHours", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                Kênh gửi
                <div className="flex min-h-10 flex-wrap items-center gap-2">
                  {["IN_APP", "EMAIL"].map((channel) => (
                    <label
                      key={channel}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                      {channel}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {form.targetType === "ROLE" && (
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            )}

            {form.targetType === "USER" && (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                User IDs
                <input
                  value={form.targetUsers}
                  onChange={(event) => updateForm("targetUsers", event.target.value)}
                  placeholder="Nhập các ID, cách nhau bằng dấu phẩy"
                  className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {saving ? "Đang gửi..." : "Gửi thông báo"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "rules" && (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {rulesLoading ? (
              <p className="p-6 text-sm text-slate-500">Đang tải luật tự động...</p>
            ) : autoRules.length ? (
              <div className="divide-y divide-slate-100">
                {autoRules.map((rule) => (
                  <div
                    key={rule._id || rule.id || rule.eventKey}
                    className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">
                          {rule.name}
                        </h2>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            PRIORITY_BADGE[rule.priority] || PRIORITY_BADGE.INFO
                          }`}
                        >
                          {rule.priority || "INFO"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {rule.eventKey}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {rule.description || rule.content || "Không có mô tả."}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        Channels: {(rule.channels || ["IN_APP"]).join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(rule.enabled)}
                          onChange={(event) =>
                            updateRule(rule, { enabled: event.target.checked })
                          }
                        />
                        Bật
                      </label>
                      <button
                        type="button"
                        onClick={() => testRule(rule)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Zap size={16} />
                        Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">Chưa có luật tự động.</p>
            )}
          </section>
        )}

        {activeTab === "templates" && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id || template.title}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">
                    {template.title}
                  </h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      PRIORITY_BADGE[template.priority] || PRIORITY_BADGE.INFO
                    }`}
                  >
                    {template.priority || "INFO"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {template.content || template.message}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      title: template.title || "",
                      content: template.content || template.message || "",
                      priority: template.priority || "INFO",
                    }))
                  }
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Dùng mẫu
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
