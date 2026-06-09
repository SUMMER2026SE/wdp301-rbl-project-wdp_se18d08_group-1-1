import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useSocket } from "../../contexts/SocketProvider";
import { searchUsers } from "../../services/userService";
import { createNotification, getAdminHistory, getAutoRules, updateAutoRule, testAutoRule } from "../../services/notificationService";
import AutoRulesTable from "./notifications/AutoRulesTable";

const TABS = [
  { id: "feed", label: "Live Feed" },
  { id: "compose", label: "Gửi thông báo" },
  { id: "rules", label: "Quy tắc tự động" },
];

const PRIORITIES = ["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"];

const PRIORITY_META = {
  INFO: { label: "INFO", bg: "bg-sky-500/10", color: "text-sky-400", border: "border-sky-500/30" },
  SUCCESS: { label: "SUCCESS", bg: "bg-emerald-500/10", color: "text-emerald-400", border: "border-emerald-500/30" },
  WARNING: { label: "WARNING", bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/30" },
  ERROR: { label: "ERROR", bg: "bg-red-500/10", color: "text-red-400", border: "border-red-500/30" },
  SYSTEM: { label: "SYSTEM", bg: "bg-violet-500/10", color: "text-violet-400", border: "border-violet-500/30" },
};

export default function NotificationManagement() {
  const [tab, setTab] = useState("feed");
  const [ruleToast, setRuleToast] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiStats, setApiStats] = useState({ totalSent: 0, success: 0, errors: 0 });
  const [autoRules, setAutoRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const socket = useSocket();

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getAdminHistory({ limit: 50 });
      if (res.ok && res.data?.data) {
        setHistoryList(res.data.data);
        if (res.data.stats) {
          setApiStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const res = await getAutoRules();
      if (res.ok && res.data?.data) {
        setAutoRules(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch auto rules:", err);
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchHistory();
      await fetchRules();
    };
    initialize();
  }, []);

  const handleRuleUpdate = async (eventKey, data) => {
    const res = await updateAutoRule(eventKey, data);
    if (res.ok) {
      await fetchRules();
    } else {
      console.error("Failed to update rule:", res);
    }
  };

  const handleRuleTest = async (eventKey) => {
    const res = await testAutoRule(eventKey);
    if (!res.ok) {
      console.error("Failed to test rule:", res);
      setRuleToast("Test rule thất bại.");
    } else {
      setRuleToast("Test rule thành công.");
      setTimeout(() => setRuleToast(null), 3000);
    }
  };

  const stats = apiStats;

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
              Gửi thông báo tới toàn hệ thống hoặc người dùng cụ thể.
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
          {tab === "feed" && <FeedTab notifications={historyList} loading={historyLoading} onRefresh={fetchHistory} />}
          {tab === "compose" && <ComposeTab onSent={() => { setTab("feed"); fetchHistory(); }} />}
          {tab === "rules" && (
            <>
              {ruleToast && (
                <div className="mb-4 text-sm text-green-400">{ruleToast}</div>
              )}
              <AutoRulesTable rules={autoRules} loading={rulesLoading} onUpdate={handleRuleUpdate} onTest={handleRuleTest} />
            </>
          )}
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
      {ok ? "LIVE · API" : "Offline"}
    </span>
  );
}

function StatsRow({ stats }) {
  const cards = [
    { label: "Tổng đã gửi (Lịch sử)", value: stats.totalSent, tone: "info", icon: "✅" },
    { label: "Gửi thành công", value: stats.success, tone: "success", icon: "🚀" },
    { label: "Cảnh báo & Lỗi", value: stats.errors, tone: "error", icon: "⚠" },
  ];
  
  const toneMap = {
    info: "border-sky-500/30 text-sky-400 bg-sky-500/10",
    system: "border-violet-500/30 text-violet-400 bg-violet-500/10",
    success: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    error: "border-red-500/30 text-red-400 bg-red-500/10",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
function FeedTab({ notifications, loading, onRefresh }) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const filtered = notifications
    .filter((m) => filter === "ALL" || m.priority === filter)
    .filter((m) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q) ||
        m.targetType?.toLowerCase().includes(q)
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
          placeholder="Tìm tiêu đề, nội dung…"
          className="w-72 max-w-full bg-[#111] border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <button
          onClick={onRefresh}
          className="text-xs px-3 py-2 rounded-md border border-white/10 hover:bg-white/5"
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <div className="rounded-3xl border border-gray-700/80 bg-gray-950/50 p-4 animate-float overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="font-semibold text-white">Live events (Lịch sử gửi API)</div>
          <div className="text-xs text-gray-400">{filtered.length} items</div>
        </div>
        <ul className="divide-y divide-white/5">
          {filtered.length === 0 && !loading && (
            <li className="px-5 py-10 text-center text-gray-500 text-sm">Chưa có thông báo phù hợp.</li>
          )}
          {loading && filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-500 text-sm">Đang tải lịch sử từ API...</li>
          )}
          {filtered.map((m) => (
            <MessageRow key={m._id || m.id} m={m} />
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

function MessageRow({ m }) {
  const meta = PRIORITY_META[m.priority] || PRIORITY_META.INFO;
  const targetLabel = m.targetType === "ALL_USERS" ? "Toàn hệ thống" : 
                      m.targetType === "MULTI_USER" ? `${m.targetUsers?.length || 0} người` : 
                      m.targetType === "SINGLE_USER" ? `Một User` : "Hệ thống";
  
  return (
    <li className={`px-5 py-4 flex items-start gap-4 bg-white/[0.02]`}>
      <div className={`w-10 h-10 rounded-lg border ${meta.bg} ${meta.color} ${meta.border} grid place-items-center text-xs font-bold shrink-0`}>
        {m.priority ? m.priority[0] : "I"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-100">{m.title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
            {meta.label}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
            {m.type || "SYSTEM"}
          </span>
        </div>
        <div className="text-sm text-gray-400 mt-1">{m.content}</div>
        <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>👤 {targetLabel}</span>
          <span>•</span>
          <span>Trạng thái: {m.status || "SENT"}</span>
          <span>•</span>
          <span>{m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: vi }) : "Vừa xong"}</span>
        </div>
      </div>
    </li>
  );
}

/* ---------------- Compose Tab ---------------- */
function ComposeTab({ onSent }) {
  const [audienceKind, setAudienceKind] = useState("single");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("INFO");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setToast(null);

    let targetType = 'ALL_USERS';
    let targetUsers = [];
    
    if (audienceKind === "multi") {
      targetType = 'MULTI_USER';
      targetUsers = selectedUsers.map(u => u._id);
    } else if (audienceKind === "single") {
      targetType = 'SINGLE_USER';
      if (selectedUsers.length === 0) {
        setIsSubmitting(false);
        return setToast("Vui lòng chọn user.");
      }
      targetUsers = [selectedUsers[0]._id];
    }

    const payload = {
      title,
      content: message,
      type: 'SYSTEM',
      priority,
      targetType,
      targetUsers,
    };

    try {
      const res = await createNotification(payload);
      if (res.ok) {
        setToast("Đã gửi thông báo thành công qua API.");
        setTimeout(onSent, 1000);
      } else {
        setToast("Lỗi API: " + (res.data?.message || JSON.stringify(res.data?.errors) || "Không xác định"));
      }
    } catch (err) {
      console.error(err);
      setToast("Lỗi kết nối API.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-lg max-w-4xl">
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
      <Field label="Nội dung (Content)">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Nội dung thông báo..."
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
                    priority === p ? `${meta.bg} ${meta.color} ${meta.border}` : "border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
        {toast && <span className={`text-xs mr-auto ${toast.includes("Lỗi") ? "text-red-400" : "text-emerald-400"}`}>{toast}</span>}
        <button
          onClick={submit}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Đang xử lý..." : "Gửi thông báo (API)"}
        </button>
      </div>
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
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await searchUsers(q);
        if (res.ok && res.data?.data) {
          setResults(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Add debounce
    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [q]);
  
  function toggle(user) {
    if (!multi) return onChange([user]);
    const exists = value.find((x) => x._id === user._id);
    onChange(exists ? value.filter((x) => x._id !== user._id) : [...value, user]);
  }
  
  return (
    <div className="mt-3 rounded-lg border border-white/5 bg-[#111] p-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm User theo username, email…"
        className="w-full bg-[#1A1A1A] border border-white/10 rounded-md px-3 py-2 text-sm mb-2 focus:outline-none placeholder:text-gray-600"
      />
      <ul className="max-h-48 overflow-y-auto divide-y divide-white/5 hide-scrollbar">
        {loading && <li className="px-2 py-4 text-center text-xs text-gray-500">Đang tìm kiếm...</li>}
        {!loading && results.length === 0 && <li className="px-2 py-4 text-center text-xs text-gray-500">Không tìm thấy người dùng.</li>}
        {results.map((u) => {
          const on = value.some((x) => x._id === u._id);
          return (
            <li key={u._id}>
              <button
                onClick={() => toggle(u)}
                className={`w-full px-2 py-2 flex items-center justify-between rounded text-sm ${on ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-white/5 text-gray-300"}`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{u.username}</span>
                  <span className="text-gray-500 text-xs">{u.email}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase border border-white/10 px-1 rounded">{u.role}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {multi && (
        <div className="text-xs text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded flex flex-wrap gap-1">
          Đã chọn {value.length} người: {value.map(v => v.username).join(', ')}
        </div>
      )}
      {!multi && value.length > 0 && (
        <div className="text-xs text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded">
          Đã chọn: {value[0].username} ({value[0].email})
        </div>
      )}
    </div>
  );
}
