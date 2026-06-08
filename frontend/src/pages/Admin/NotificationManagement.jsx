import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useNotificationStore } from "../../lib/notifications/store";

const TABS = [
  { id: "feed", label: "Live Feed" },
  { id: "compose", label: "Gửi thông báo" },
  { id: "scheduled", label: "Đã lên lịch" },
  { id: "templates", label: "Templates" },
  { id: "rules", label: "Auto Rules" },
];

const PRIORITIES = ["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"];
const CHANNELS = ["In-app", "Email", "SMS", "Push"];

const MOCK_USERS = [
  { id: "u1", name: "Trần Bình", email: "tran.binh@email.com", plate: "30A-118.77" },
  { id: "u2", name: "Lê Châu", email: "le.chau@email.com", plate: "29H-552.10" },
  { id: "u3", name: "Phạm Dũng", email: "pham.dung@email.com", plate: "60B-901.23" },
  { id: "u4", name: "Vũ Em", email: "vu.em@email.com", plate: "92C-334.55" },
  { id: "u5", name: "Hoàng Phong", email: "hoang.phong@email.com", plate: "43D-700.18" },
];

const PRIORITY_META = {
  INFO: { label: "INFO", bg: "bg-sky-500/10", color: "text-sky-400", border: "border-sky-500/30" },
  SUCCESS: { label: "SUCCESS", bg: "bg-emerald-500/10", color: "text-emerald-400", border: "border-emerald-500/30" },
  WARNING: { label: "WARNING", bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/30" },
  ERROR: { label: "ERROR", bg: "bg-red-500/10", color: "text-red-400", border: "border-red-500/30" },
  SYSTEM: { label: "SYSTEM", bg: "bg-violet-500/10", color: "text-violet-400", border: "border-violet-500/30" },
};

const CATEGORY_META = {
  account: { label: "Tài khoản" },
  wallet: { label: "Ví" },
  booking: { label: "Đặt chỗ" },
  parking: { label: "Đỗ xe" },
  system: { label: "Hệ thống" },
};

export default function NotificationManagement() {
  const [tab, setTab] = useState("feed");
  const notifications = useNotificationStore((state) => state.notifications);
  const scheduled = useNotificationStore((state) => state.scheduled);
  const autoRules = useNotificationStore((state) => state.autoRules);
  const triggerAutoEvent = useNotificationStore((state) => state.triggerAutoEvent);
  
  // Fake socket status since it's just mock UI
  const socket = "connected";

  // Simulate auto events
  useEffect(() => {
    const enabled = autoRules.filter((r) => r.enabled);
    if (!enabled.length) return;
    const t = setInterval(() => {
      const r = enabled[Math.floor(Math.random() * enabled.length)];
      triggerAutoEvent(r.eventKey);
    }, 15000); // 15s for demo
    return () => clearInterval(t);
  }, [autoRules, triggerAutoEvent]);

  const stats = useMemo(() => {
    const unread = notifications.filter((m) => !m.read).length;
    const schedCount = scheduled.length;
    const auto = notifications.filter((m) => m.eventKey && m.eventKey !== "scheduled").length;
    const errors = notifications.filter((m) => m.priority === "ERROR" || m.priority === "WARNING").length;
    return { unread, scheduled: schedCount, auto, errors };
  }, [notifications, scheduled]);

  return (
    <div className="bg-[#0D0D0D] text-gray-100 min-h-full">
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">Notification Management</h1>
              <LiveBadge socket={socket} />
            </div>
            <p className="text-gray-400 mt-1">
              Gửi thủ công, lên lịch, quản lý template và cấu hình thông báo tự động cho toàn hệ thống.
            </p>
          </div>
        </header>

        <StatsRow stats={stats} />

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section className="mt-6">
          {tab === "feed" && <FeedTab notifications={notifications} />}
          {tab === "compose" && <ComposeTab onSent={() => setTab("feed")} />}
          {tab === "scheduled" && <ScheduledTab scheduled={scheduled} />}
          {tab === "templates" && <TemplatesTab onUse={() => setTab("compose")} />}
          {tab === "rules" && <RulesTab autoRules={autoRules} />}
        </section>
      </div>
    </div>
  );
}

function LiveBadge({ socket }) {
  const ok = socket === "connected";
  return (
    <span className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border ${
      ok ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"
    }`}>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
      {ok ? "LIVE · Socket.io" : "Reconnecting…"}
    </span>
  );
}

function StatsRow({ stats }) {
  const cards = [
    { label: "Unread", value: stats.unread, tone: "info", icon: "🔔" },
    { label: "Đã lên lịch", value: stats.scheduled, tone: "system", icon: "🗓" },
    { label: "Auto-sent (session)", value: stats.auto, tone: "success", icon: "⚡" },
    { label: "Warning & Error", value: stats.errors, tone: "error", icon: "⚠" },
  ];
  
  const toneMap = {
    info: "border-sky-500/30 text-sky-400 bg-sky-500/10",
    system: "border-violet-500/30 text-violet-400 bg-violet-500/10",
    success: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    error: "border-red-500/30 text-red-400 bg-red-500/10",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-lg">
          <div className={`w-11 h-11 rounded-lg border ${toneMap[c.tone]} grid place-items-center text-lg`}>{c.icon}</div>
          <div className="mt-4 text-4xl font-bold tracking-tight text-white">{c.value}</div>
          <div className="text-sm text-gray-400 mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Feed Tab ---------------- */
function FeedTab({ notifications }) {
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);
  
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const filtered = notifications
    .filter((m) => filter === "ALL" || m.priority === filter)
    .filter((m) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q) ||
        (m.target?.value && m.target.value.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Tất cả" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        {PRIORITIES.map((p) => (
          <FilterChip key={p} label={p} active={filter === p} onClick={() => setFilter(p)} tone={p} />
        ))}
        <div className="flex-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo biển số, email, tiêu đề…"
          className="w-72 max-w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <button
          onClick={markAllRead}
          className="text-xs px-3 py-2 rounded-md border border-white/10 hover:bg-white/5"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="font-semibold text-white">Live events</div>
          <div className="text-xs text-gray-400">{filtered.length} items</div>
        </div>
        <ul className="divide-y divide-white/5">
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-500 text-sm">Chưa có thông báo phù hợp.</li>
          )}
          {filtered.map((m) => (
            <MessageRow key={m.id} m={m} onToggleRead={() => markRead(m.id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, tone }) {
  const toneCls = tone ? PRIORITY_META[tone] : null;
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? toneCls
            ? `${toneCls.bg} ${toneCls.color} ${toneCls.border}`
            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
          : "border-white/10 text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function MessageRow({ m, onToggleRead }) {
  const meta = PRIORITY_META[m.priority] || PRIORITY_META.INFO;
  const targetLabel = m.target?.type === "all" ? "Toàn hệ thống" : (m.target?.type === "single" ? m.target.value : "System");
  
  return (
    <li className={`px-5 py-4 flex items-start gap-4 ${!m.read ? "bg-white/[0.02]" : ""}`}>
      <div className={`w-10 h-10 rounded-lg border ${meta.bg} ${meta.color} ${meta.border} grid place-items-center text-xs font-bold shrink-0`}>
        {m.priority[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-100">{m.title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
            {meta.label}
          </span>
          {m.eventKey && m.eventKey !== "scheduled" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
              AUTO · {m.eventKey}
            </span>
          )}
          {!m.read && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
        </div>
        <div className="text-sm text-gray-400 mt-1">{m.message}</div>
        <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>👤 {targetLabel}</span>
          <span>•</span>
          <span>{(m.channels || []).join(", ")}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: vi })}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggleRead} className="text-xs px-2 py-1 rounded hover:bg-white/5 text-gray-400">
          {m.read ? "Mark unread" : "Mark read"}
        </button>
      </div>
    </li>
  );
}

/* ---------------- Compose Tab ---------------- */
function ComposeTab({ onSent }) {
  const templates = useNotificationStore((state) => state.templates);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const scheduleNotification = useNotificationStore((state) => state.scheduleNotification);
  
  const [audienceKind, setAudienceKind] = useState("single");
  const [selectedUsers, setSelectedUsers] = useState([MOCK_USERS[0].id]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("INFO");
  const [channels, setChannels] = useState(["In-app"]);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [toast, setToast] = useState(null);

  function applyTemplate(tpl) {
    setTitle(tpl.title || tpl.name);
    setMessage(tpl.message || tpl.body);
    setPriority(tpl.priority);
    setChannels(tpl.channels || ["In-app"]);
  }

  function submit() {
    let target;
    if (audienceKind === "all") target = { type: "all" };
    else if (audienceKind === "multi") target = { type: "multi", value: selectedUsers.join(",") };
    else {
      const u = MOCK_USERS.find((x) => x.id === selectedUsers[0]);
      if (!u) return setToast("Chọn user trước.");
      target = { type: "single", value: u.email };
    }

    const payload = {
      title,
      message,
      priority,
      target,
      channels,
    };

    if (schedule && scheduledAt) {
      scheduleNotification({ ...payload, sendAt: new Date(scheduledAt).toISOString() });
      setToast("Đã lên lịch gửi.");
    } else {
      addNotification(payload);
      setToast("Đã gửi thông báo.");
    }
    
    setTimeout(onSent, 600);
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-lg">
        <Field label="Gửi đến">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "single", label: "Một Customer" },
              { id: "multi", label: "Nhiều Customer" },
              { id: "all", label: "Toàn bộ hệ thống" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAudienceKind(opt.id)}
                className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                  audienceKind === opt.id ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 hover:bg-white/5 text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {audienceKind !== "all" && (
            <UserPicker
              multi={audienceKind === "multi"}
              value={selectedUsers}
              onChange={setSelectedUsers}
            />
          )}
        </Field>
        <Field label="Tiêu đề">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bảo trì hệ thống tối nay"
            className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-gray-600"
          />
        </Field>
        <Field label="Nội dung">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Nội dung thông báo. Hỗ trợ biến: {{name}}, {{plate}}, {{balance}}…"
            className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-gray-600"
          />
        </Field>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Mức ưu tiên">
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const meta = PRIORITY_META[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      priority === p ? `${meta.bg} ${meta.color} ${meta.border}` : "border-white/10 text-gray-400"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Kênh gửi">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const on = channels.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => setChannels(on ? channels.filter((x) => x !== c) : [...channels, c])}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      on ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "border-white/10 text-gray-400"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        
        <Field label="Lên lịch gửi">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="accent-emerald-500" />
            Gửi vào thời điểm cụ thể
          </label>
          {schedule && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm block"
            />
          )}
        </Field>
        
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          {toast && <span className="text-xs text-gray-400 mr-auto">{toast}</span>}
          <button
            onClick={submit}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            {schedule ? "Lên lịch" : "Gửi ngay"}
          </button>
        </div>
      </div>
      
      <aside className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-lg">
        <div className="font-semibold mb-3 text-white">Templates gợi ý</div>
        <div className="space-y-2">
          {templates.map((tpl) => {
            const meta = PRIORITY_META[tpl.priority] || PRIORITY_META.INFO;
            return (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-emerald-500/40 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{tpl.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {tpl.priority}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.message || tpl.body}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Nhấn template để pre-fill form. Quản lý templates trong tab <b className="text-gray-400">Templates</b>.
        </p>
      </aside>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-gray-500">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function UserPicker({ multi, value, onChange }) {
  const [q, setQ] = useState("");
  const results = MOCK_USERS.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.plate.includes(q),
  );
  
  function toggle(id) {
    if (!multi) return onChange([id]);
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }
  
  return (
    <div className="mt-3 rounded-lg border border-white/5 bg-[#111] p-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm user theo tên, email, biển số…"
        className="w-full bg-[#1A1A1A] border border-white/10 rounded-md px-3 py-2 text-sm mb-2 focus:outline-none placeholder:text-gray-600"
      />
      <ul className="max-h-48 overflow-y-auto divide-y divide-white/5">
        {results.map((u) => {
          const on = value.includes(u.id);
          return (
            <li key={u.id}>
              <button
                onClick={() => toggle(u.id)}
                className={`w-full px-2 py-2 flex items-center justify-between rounded text-sm ${on ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-white/5 text-gray-300"}`}
              >
                <span>
                  <span className="font-medium">{u.name}</span>
                  <span className="text-gray-500 ml-2">{u.email}</span>
                </span>
                <span className="text-xs text-gray-500">{u.plate}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {multi && (
        <div className="text-xs text-gray-500 mt-2">Đã chọn {value.length} người.</div>
      )}
    </div>
  );
}

/* ---------------- Scheduled Tab ---------------- */
function ScheduledTab({ scheduled }) {
  const removeScheduled = useNotificationStore((state) => state.removeScheduled);
  
  return (
    <div className="rounded-xl border border-white/5 bg-[#1A1A1A] shadow-lg">
      <div className="px-5 py-3 border-b border-white/5 font-semibold text-white">Thông báo đã lên lịch ({scheduled.length})</div>
      {scheduled.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-500 text-sm">Chưa lên lịch thông báo nào.</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {scheduled.map((m) => {
            const meta = PRIORITY_META[m.priority] || PRIORITY_META.INFO;
            const targetLabel = m.target?.type === "all" ? "Toàn hệ thống" : m.target?.value;
            
            return (
              <li key={m.id} className="px-5 py-4 flex items-start gap-4">
                <div className={`px-2 py-1 rounded text-[10px] font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>{m.priority}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-100">{m.title}</div>
                  <div className="text-sm text-gray-400">{m.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    🗓 Gửi lúc {m.sendAt && new Date(m.sendAt).toLocaleString("vi-VN")} · {targetLabel}
                  </div>
                </div>
                <button onClick={() => removeScheduled(m.id)} className="text-xs text-red-400 hover:underline">
                  Hủy lịch
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Templates Tab ---------------- */
function TemplatesTab({ onUse }) {
  const templates = useNotificationStore((state) => state.templates);
  const addTemplate = useNotificationStore((state) => state.addTemplate);
  const updateTemplate = useNotificationStore((state) => state.updateTemplate);
  const deleteTemplate = useNotificationStore((state) => state.deleteTemplate);
  
  const [editing, setEditing] = useState(null);
  
  function blank() {
    return {
      id: `tpl_${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      title: "",
      message: "",
      priority: "INFO",
      channels: ["In-app"],
      category: "system",
    };
  }
  
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="font-semibold text-white">Templates ({templates.length})</div>
          <button onClick={() => setEditing(blank())} className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500">
            + Tạo template
          </button>
        </div>
        <ul className="divide-y divide-white/5">
          {templates.map((t) => {
            const meta = PRIORITY_META[t.priority] || PRIORITY_META.INFO;
            const catMeta = CATEGORY_META[t.category] || CATEGORY_META.system;
            
            return (
              <li key={t.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap text-gray-200">
                      {t.name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>{t.priority}</span>
                      {t.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
                          {catMeta?.label || t.category}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.message || t.body}</div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button onClick={() => setEditing(t)} className="text-xs px-2 py-1 rounded hover:bg-white/5 text-gray-300">Sửa</button>
                    <button onClick={onUse} className="text-xs px-2 py-1 rounded hover:bg-white/5 text-emerald-400">Dùng</button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-xs px-2 py-1 rounded hover:bg-white/5 text-red-400">Xóa</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-lg">
        <div className="font-semibold mb-3 text-white">
          {editing ? (templates.some((t) => t.id === editing.id) ? "Sửa template" : "Template mới") : "Chọn template để sửa"}
        </div>
        {!editing ? (
          <p className="text-sm text-gray-500">Chọn một template ở danh sách, hoặc nhấn “Tạo template”.</p>
        ) : (
          <TemplateEditor
            tpl={editing}
            onChange={setEditing}
            onSave={() => {
              if (!editing.name.trim() || !editing.title.trim()) return;
              if (templates.some((t) => t.id === editing.id)) {
                updateTemplate(editing.id, editing);
              } else {
                addTemplate(editing);
              }
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  );
}

function TemplateEditor({ tpl, onChange, onSave, onCancel }) {
  return (
    <div className="space-y-3">
      <Field label="Tên template">
        <input className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none" value={tpl.name} onChange={(e) => onChange({ ...tpl, name: e.target.value })} />
      </Field>
      <Field label="Tiêu đề">
        <input className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none" value={tpl.title} onChange={(e) => onChange({ ...tpl, title: e.target.value })} />
      </Field>
      <Field label="Nội dung">
        <textarea rows={4} className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none" value={tpl.message || tpl.body || ""} onChange={(e) => onChange({ ...tpl, message: e.target.value, body: e.target.value })} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Priority">
          <select className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none" value={tpl.priority} onChange={(e) => onChange({ ...tpl, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none" value={tpl.category} onChange={(e) => onChange({ ...tpl, category: e.target.value })}>
            {Object.keys(CATEGORY_META).filter(k => k.match(/^[a-z]+$/)).map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Channels">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => {
            const on = (tpl.channels || []).includes(c);
            return (
              <button key={c} onClick={() => onChange({ ...tpl, channels: on ? tpl.channels.filter((x) => x !== c) : [...(tpl.channels || []), c] })}
                className={`text-xs px-3 py-1.5 rounded-full border ${on ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "border-white/10 text-gray-400"}`}>
                {c}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
        <button onClick={onCancel} className="text-sm px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 text-gray-300">Hủy</button>
        <button onClick={onSave} className="text-sm px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500">Lưu</button>
      </div>
    </div>
  );
}

/* ---------------- Rules Tab ---------------- */
function RulesTab({ autoRules }) {
  const updateAutoRule = useNotificationStore((state) => state.updateAutoRule);
  const triggerAutoEvent = useNotificationStore((state) => state.triggerAutoEvent);
  
  const grouped = useMemo(() => {
    const g = {};
    autoRules.forEach((r) => {
      const cat = r.group || "Khác";
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    });
    return g;
  }, [autoRules]);
  
  const [lastTest, setLastTest] = useState(null);
  
  function test(k) {
    const res = triggerAutoEvent(k);
    setLastTest(res ? `✓ Đã gửi test cho ${k}` : `⚠ ${k}: Rule đang tắt hoặc bị throttle.`);
    setTimeout(() => setLastTest(null), 3000);
  }
  
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-lg">
        <div className="font-semibold text-white">Auto Notifications</div>
        <p className="text-sm text-gray-400 mt-1">
          Hệ thống tự động tạo notification khi có sự kiện. Mỗi rule có anti-spam (throttle), dedup webhook,
          và lưu DB kể cả khi user offline.
        </p>
        {lastTest && <div className="mt-3 text-xs text-emerald-400">{lastTest}</div>}
      </div>
      
      {Object.keys(grouped).map((cat) => (
        <div key={cat} className="rounded-xl border border-white/5 bg-[#1A1A1A] shadow-lg">
          <div className="px-5 py-3 border-b border-white/5 font-semibold flex items-center justify-between text-white">
            <span>{cat}</span>
            <span className="text-xs text-gray-500">{grouped[cat].filter((r) => r.enabled).length}/{grouped[cat].length} bật</span>
          </div>
          <ul className="divide-y divide-white/5">
            {grouped[cat].map((r) => {
              const meta = PRIORITY_META[r.priority || "INFO"] || PRIORITY_META.INFO;
              return (
                <li key={r.eventKey} className="px-5 py-4 flex items-start gap-4">
                  <button
                    onClick={() => updateAutoRule(r.eventKey, { enabled: !r.enabled })}
                    className={`mt-1 w-10 h-6 rounded-full border transition-colors relative ${
                      r.enabled ? "bg-emerald-500 border-emerald-500" : "bg-[#111] border-white/10"
                    }`}
                  >
                    <span className={`block absolute top-[1px] w-[20px] h-[20px] rounded-full bg-white transform transition-transform ${r.enabled ? "translate-x-[18px]" : "translate-x-[1px]"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-200">{r.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>{r.priority || "INFO"}</span>
                      <code className="text-[10px] text-gray-500">{r.eventKey}</code>
                      {r.throttleMinutes && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
                          throttle {r.throttleMinutes}p
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-2">
                      {CHANNELS.map((c) => {
                        const on = (r.channels || []).includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => updateAutoRule(r.eventKey, { channels: on ? r.channels.filter((x) => x !== c) : [...(r.channels || []), c] })}
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${on ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "border-white/10 text-gray-500"}`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => test(r.eventKey)}
                    className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-gray-300"
                  >
                    Test
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
