import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useSocket } from "../../contexts/SocketProvider";
import { searchUsers } from "../../services/userService";
import {
  createNotification,
  deleteAdminHistoryNotification,
  getAdminHistory,
  getAutoRules,
  markAdminHistoryAsRead,
  markAllAdminHistoryAsRead,
  testAutoRule,
  updateAutoRule,
} from "../../services/notificationService";
import AutoRulesTable from "./notifications/AutoRulesTable";

const TABS = [
  { id: "feed", label: "Lịch sử", icon: Bell },
  { id: "compose", label: "Soạn gửi", icon: Send },
  { id: "rules", label: "Luật tự động", icon: Zap },
];

const PRIORITIES = ["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"];
const TYPES = ["SYSTEM", "PARKING", "BOOKING", "WALLET", "PAYMENT", "ACCOUNT", "PROMOTION", "CAMERA"];

const PRIORITY_META = {
  INFO: { label: "Thông tin", dot: "bg-sky-400", chip: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  SUCCESS: { label: "Thành công", dot: "bg-emerald-400", chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  WARNING: { label: "Cảnh báo", dot: "bg-amber-400", chip: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  ERROR: { label: "Lỗi", dot: "bg-red-400", chip: "border-red-500/30 bg-red-500/10 text-red-300" },
  SYSTEM: { label: "Hệ thống", dot: "bg-violet-400", chip: "border-violet-500/30 bg-violet-500/10 text-violet-300" },
};

const emptyForm = {
  title: "",
  content: "",
  type: "SYSTEM",
  priority: "INFO",
  audience: "ALL_USERS",
  users: [],
};

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("valo_user") || "{}");
  } catch {
    return {};
  }
}

function formatTime(value) {
  if (!value) return "Chưa có dữ liệu";
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi });
}

function getTargetLabel(item) {
  if (item.targetType === "ALL_USERS") return "Tất cả khách hàng";
  if (item.targetType === "MULTI_USER") return `${item.targetUsers?.length || 0} người nhận`;
  if (item.targetType === "SINGLE_USER") {
    const user = Array.isArray(item.targetUsers) ? item.targetUsers[0] : null;
    return user?.email || user?.username || "Một người nhận";
  }
  return "Hệ thống";
}

export default function NotificationManagement() {
  const socket = useSocket();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";
  const accent = isAdmin ? "yellow" : "emerald";
  const [tab, setTab] = useState("feed");
  const [historyList, setHistoryList] = useState([]);
  const [autoRules, setAutoRules] = useState([]);
  const [stats, setStats] = useState({ totalSent: 0, success: 0, errors: 0 });
  const [filters, setFilters] = useState({ search: "", priority: "ALL" });
  const [loading, setLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const theme = useMemo(
    () =>
      accent === "yellow"
        ? {
            text: "text-yellow-300",
            border: "border-yellow-500/30",
            bg: "bg-yellow-500/10",
            button: "bg-yellow-500 text-black hover:bg-yellow-400",
            ring: "focus:border-yellow-400",
          }
        : {
            text: "text-emerald-300",
            border: "border-emerald-500/30",
            bg: "bg-emerald-500/10",
            button: "bg-emerald-500 text-white hover:bg-emerald-400",
            ring: "focus:border-emerald-400",
          },
    [accent]
  );

  const unreadAdmin = useMemo(() => historyList.filter((item) => !item.isRead).length, [historyList]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getAdminHistory({
      limit: 50,
      search: filters.search.trim() || undefined,
      priority: filters.priority === "ALL" ? undefined : filters.priority,
    });

    if (res.ok) {
      setHistoryList(res.data?.data || []);
      setStats(res.data?.stats || { totalSent: 0, success: 0, errors: 0 });
    } else {
      setError(res.data?.message || "Không tải được lịch sử thông báo.");
    }
    setLoading(false);
  }, [filters.priority, filters.search]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    setError("");
    const res = await getAutoRules();
    if (res.ok) {
      setAutoRules(res.data?.data || []);
    } else {
      setError(res.data?.message || "Không tải được luật thông báo.");
    }
    setRulesLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleAdminNotification = (payload) => {
      setHistoryList((current) => [{ ...payload, isRead: false }, ...current]);
      setStats((current) => ({ ...current, totalSent: current.totalSent + 1 }));
    };

    socket.on("notification:admin:new", handleAdminNotification);
    return () => socket.off("notification:admin:new", handleAdminNotification);
  }, [socket]);

  const flash = (message, isError = false) => {
    setNotice(isError ? "" : message);
    setError(isError ? message : "");
    window.setTimeout(() => {
      setNotice("");
      if (!isError) return;
      setError("");
    }, 3000);
  };

  const markOneRead = async (id) => {
    const res = await markAdminHistoryAsRead(id);
    if (!res.ok) return flash(res.data?.message || "Không đánh dấu được thông báo.", true);
    setHistoryList((current) => current.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
  };

  const markAllRead = async () => {
    const res = await markAllAdminHistoryAsRead();
    if (!res.ok) return flash(res.data?.message || "Không đánh dấu được thông báo.", true);
    setHistoryList((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  const removeNotification = async (id) => {
    const res = await deleteAdminHistoryNotification(id);
    if (!res.ok) return flash(res.data?.message || "Không xóa được thông báo.", true);
    setHistoryList((current) => current.filter((item) => item._id !== id));
  };

  const updateRule = async (eventKey, patch) => {
    const res = await updateAutoRule(eventKey, patch);
    if (!res.ok) return flash(res.data?.message || "Cập nhật luật thất bại.", true);
    await fetchRules();
    flash("Đã cập nhật luật thông báo.");
  };

  const testRule = async (eventKey) => {
    const res = await testAutoRule(eventKey);
    if (!res.ok) return flash(res.data?.message || "Gửi thử luật thất bại.", true);
    const email = res.data?.data?.email;
    if (email?.sent) {
      flash(`Đã gửi thông báo thử nghiệm và email tới ${email.to}.`);
    } else if (email?.reason) {
      flash(`Đã gửi in-app test. Email chưa gửi: ${email.reason}.`);
    } else {
      flash("Đã gửi thông báo thử nghiệm.");
    }
    fetchHistory();
  };

  const submitNotification = async (form) => {
    setSaving(true);
    setError("");
    const targetUsers = form.audience === "ALL_USERS" ? [] : form.users.map((user) => user._id);
    const res = await createNotification({
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      priority: form.priority,
      targetType: form.audience,
      targetUsers,
    });

    setSaving(false);
    if (!res.ok) {
      flash(res.data?.message || res.data?.errors?.[0]?.msg || "Gửi thông báo thất bại.", true);
      return false;
    }

    flash("Đã gửi thông báo.");
    setTab("feed");
    fetchHistory();
    return true;
  };

  return (
    <div className="min-h-full bg-[#0D0D0D] text-gray-100">
      <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.border} ${theme.bg} ${theme.text}`}>
              <ShieldCheck size={14} />
              {isAdmin ? "Admin" : "Staff"} Notification Center
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white lg:text-3xl">Quản lý thông báo</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Theo dõi lịch sử gửi, tạo thông báo cho khách hàng và cấu hình các trigger tự động.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${socket?.connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
            <span className={`h-2 w-2 rounded-full ${socket?.connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            {socket?.connected ? "Socket live" : "Socket offline"}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tổng đã gửi" value={stats.totalSent || historyList.length} icon={Bell} />
          <StatCard label="Chưa đọc nội bộ" value={unreadAdmin} icon={Mail} />
          <StatCard label="Thành công/Info" value={stats.success || 0} icon={CheckCircle2} />
          <StatCard label="Cảnh báo/Lỗi" value={stats.errors || 0} icon={CircleAlert} />
        </section>

        {(notice || error) && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : `${theme.border} ${theme.bg} ${theme.text}`}`}>
            {error || notice}
          </div>
        )}

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-white/10">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === id ? `${theme.text} ${theme.border}` : "border-transparent text-gray-500 hover:text-gray-200"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <section className="mt-6">
          {tab === "feed" && (
            <FeedTab
              filters={filters}
              items={historyList}
              loading={loading}
              theme={theme}
              onChangeFilters={setFilters}
              onRefresh={fetchHistory}
              onRead={markOneRead}
              onReadAll={markAllRead}
              onDelete={removeNotification}
            />
          )}
          {tab === "compose" && <ComposeTab theme={theme} saving={saving} onSubmit={submitNotification} />}
          {tab === "rules" && (
            <AutoRulesTable
              rules={autoRules}
              loading={rulesLoading}
              accent={accent}
              onUpdate={updateRule}
              onTest={testRule}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#151515] p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-gray-300">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function FeedTab({ filters, items, loading, theme, onChangeFilters, onRefresh, onRead, onReadAll, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#151515] p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={filters.search}
            onChange={(event) => onChangeFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Tìm tiêu đề, nội dung, người nhận"
            className={`h-10 w-full rounded-lg border border-white/10 bg-[#0D0D0D] pl-9 pr-3 text-sm text-gray-100 outline-none ${theme.ring}`}
          />
        </div>
        <select
          value={filters.priority}
          onChange={(event) => onChangeFilters((current) => ({ ...current, priority: event.target.value }))}
          className={`h-10 rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-gray-100 outline-none ${theme.ring}`}
        >
          <option value="ALL">Tất cả mức ưu tiên</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <button type="button" onClick={onReadAll} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-gray-300 hover:bg-white/5">
          <CheckCircle2 size={16} />
          Đã đọc tất cả
        </button>
        <button type="button" onClick={onRefresh} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${theme.button}`}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Làm mới
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151515]">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
            <Loader2 className="animate-spin" size={16} />
            Đang tải lịch sử thông báo...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Chưa có thông báo phù hợp.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((item) => (
              <NotificationRow key={item._id} item={item} onRead={onRead} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ item, onRead, onDelete }) {
  const meta = PRIORITY_META[item.priority] || PRIORITY_META.INFO;

  return (
    <article className={`flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between ${item.isRead ? "" : "bg-white/[0.03]"}`}>
      <div className="flex min-w-0 gap-3">
        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-gray-700" : meta.dot}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>{meta.label}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-400">{item.type || "SYSTEM"}</span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Clock3 size={12} />
              {formatTime(item.createdAt)}
            </span>
          </div>
          <h2 className="mt-2 truncate text-base font-semibold text-white">{item.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-400">{item.content}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
            <Users size={13} />
            {getTargetLabel(item)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 lg:justify-end">
        {!item.isRead && (
          <button type="button" onClick={() => onRead(item._id)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Đánh dấu đã đọc">
            <CheckCircle2 size={16} />
          </button>
        )}
        <button type="button" onClick={() => onDelete(item._id)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 text-red-300 hover:bg-red-500/10" aria-label="Ẩn thông báo">
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function ComposeTab({ theme, saving, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  const valid = form.title.trim() && form.content.trim() && (form.audience === "ALL_USERS" || form.users.length > 0);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    const ok = await onSubmit(form);
    if (ok) setForm(emptyForm);
  };

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-xl border border-white/5 bg-[#151515] p-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <Field label="Tiêu đề">
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            maxLength={200}
            placeholder="Ví dụ: Bảo trì hệ thống tối nay"
            className={`h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none ${theme.ring}`}
          />
        </Field>
        <Field label="Nội dung">
          <textarea
            value={form.content}
            onChange={(event) => update("content", event.target.value)}
            maxLength={2000}
            rows={7}
            placeholder="Nhập nội dung thông báo"
            className={`w-full resize-none rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-3 text-sm leading-6 text-white outline-none ${theme.ring}`}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại">
            <select value={form.type} onChange={(event) => update("type", event.target.value)} className={`h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none ${theme.ring}`}>
              {TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Mức ưu tiên">
            <select value={form.priority} onChange={(event) => update("priority", event.target.value)} className={`h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none ${theme.ring}`}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Người nhận">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: "ALL_USERS", label: "Tất cả" },
              { value: "SINGLE_USER", label: "Một user" },
              { value: "MULTI_USER", label: "Nhiều user" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update("audience", option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  form.audience === option.value ? `${theme.border} ${theme.bg} ${theme.text}` : "border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        {form.audience !== "ALL_USERS" && (
          <UserPicker
            multi={form.audience === "MULTI_USER"}
            value={form.users}
            onChange={(users) => update("users", users)}
            theme={theme}
          />
        )}

        <div className="rounded-xl border border-white/5 bg-[#0D0D0D] p-4">
          <p className="text-sm font-semibold text-white">Tóm tắt</p>
          <div className="mt-3 space-y-2 text-sm text-gray-400">
            <p>Loại: <span className="text-gray-200">{form.type}</span></p>
            <p>Ưu tiên: <span className="text-gray-200">{form.priority}</span></p>
            <p>Người nhận: <span className="text-gray-200">{form.audience === "ALL_USERS" ? "Tất cả khách hàng" : `${form.users.length} user`}</span></p>
          </div>
        </div>

        <button type="submit" disabled={!valid || saving} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Gửi thông báo
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function UserPicker({ multi, value, onChange, theme }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const res = await searchUsers(q.trim());
      setResults(res.ok ? res.data?.data || [] : []);
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [q]);

  const toggle = (user) => {
    if (!multi) return onChange([user]);
    const exists = value.some((item) => item._id === user._id);
    onChange(exists ? value.filter((item) => item._id !== user._id) : [...value, user]);
  };

  const remove = (id) => onChange(value.filter((item) => item._id !== id));

  return (
    <div className="rounded-xl border border-white/5 bg-[#0D0D0D] p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm username hoặc email"
          className={`h-10 w-full rounded-lg border border-white/10 bg-[#151515] pl-9 pr-3 text-sm text-white outline-none ${theme.ring}`}
        />
      </div>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((user) => (
            <span key={user._id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${theme.border} ${theme.bg} ${theme.text}`}>
              {user.email || user.username}
              <button type="button" onClick={() => remove(user._id)} className="hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-white/5">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={14} />
            Đang tìm...
          </div>
        ) : results.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Không có người dùng phù hợp.</p>
        ) : (
          results.map((user) => {
            const active = value.some((item) => item._id === user._id);
            return (
              <button
                key={user._id}
                type="button"
                onClick={() => toggle(user)}
                className={`flex w-full items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-left last:border-0 hover:bg-white/5 ${active ? "bg-white/[0.04]" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-200">{user.username || "User"}</span>
                  <span className="block truncate text-xs text-gray-500">{user.email}</span>
                </span>
                <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-500">{user.role}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
