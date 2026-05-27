import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Car,
  Check,
  Clock,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Wallet,
  X,
} from "lucide-react";

const G = "#D4AF37";
const G15 = "rgba(212,175,55,0.15)";
const SURF = "rgba(255,255,255,0.03)";
const BD = "rgba(255,255,255,0.09)";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

const VEHICLES = [
  {
    id: 1,
    name: "BMW i8",
    plate: "51A-888.88",
    type: "Sports Coupe",
    color: "#3b82f6",
  },
  {
    id: 2,
    name: "Mercedes C300",
    plate: "30G-456.78",
    type: "Sedan",
    color: "#10b981",
  },
];

const SESSIONS = [
  {
    id: "s1",
    location: "VALO Center District 1",
    date: "Today, 09:42",
    duration: "2h 25m",
    spot: "A-12",
    vehicle: "51A-888.88",
    cost: 46000,
  },
  {
    id: "s2",
    location: "VALO Landmark 81",
    date: "Yesterday, 18:10",
    duration: "1h 18m",
    spot: "B-07",
    vehicle: "30G-456.78",
    cost: 28000,
  },
  {
    id: "s3",
    location: "VALO Phu Nhuan",
    date: "Mon, 13:22",
    duration: "3h 05m",
    spot: "C-03",
    vehicle: "51A-888.88",
    cost: 62000,
  },
  {
    id: "s4",
    location: "VALO Thu Duc",
    date: "Sun, 10:05",
    duration: "58m",
    spot: "E-14",
    vehicle: "30G-456.78",
    cost: 20000,
  },
];

const TRANSACTIONS = [
  { id: "t1", label: "Top up via Visa", date: "Today", amount: 500000 },
  { id: "t2", label: "Parking fee", date: "Today", amount: -46000 },
  { id: "t3", label: "Parking fee", date: "Yesterday", amount: -28000 },
  { id: "t4", label: "Top up via Bank", date: "3 days ago", amount: 300000 },
];

const NOTIFICATIONS = [
  {
    id: 1,
    title: "Plate recognition improved",
    desc: "Your last entry was auto-opened in 0.8s.",
    at: "2 hours ago",
  },
  {
    id: 2,
    title: "Monthly summary ready",
    desc: "Review your spend and optimized parking windows.",
    at: "Yesterday",
  },
];

const fmt = (n) =>
  `${n < 0 ? "-" : ""}d ${Math.abs(n).toLocaleString("vi-VN")}`;

const getInitials = (name) =>
  String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

const Panel = ({ children, className = "", style = {} }) => (
  <section
    className={`rounded-[22px] p-4 ${className}`}
    style={{
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: "blur(16px)",
      ...style,
    }}
  >
    {children}
  </section>
);

const SectionTitle = ({ icon: Icon, children, action }) => (
  <div className="flex items-center justify-between gap-3 mb-3">
    <h2 className="text-sm md:text-base font-black text-white/90 flex items-center gap-2 tracking-[0.06em] uppercase">
      <Icon size={15} style={{ color: G }} />
      {children}
    </h2>
    {action}
  </div>
);

function ProfileOverview({ user, sessionUser }) {
  const email = sessionUser?.email || user.email;
  const [loading, setLoading] = useState(
    () => !!localStorage.getItem("accessToken"),
  );
  const [apiErr, setApiErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [apiProfile, setApiProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email,
    phone: user.phone || "",
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    apiFetch("/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ ok, data }) => {
        if (ok && data?.data) {
          const p = data.data;
          setApiProfile(p);
          setForm({
            firstName: p.profile?.firstName || "",
            lastName: p.profile?.lastName || "",
            email: p.email || email,
            phone: p.profile?.phone || user.phone || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [email, user.phone]);

  const displayName = useMemo(() => {
    if (!apiProfile) return user.name;
    return (
      `${apiProfile.profile?.firstName || ""} ${apiProfile.profile?.lastName || ""}`.trim() ||
      apiProfile.username ||
      user.name
    );
  }, [apiProfile, user.name]);

  const totalSpent = SESSIONS.reduce((acc, s) => acc + s.cost, 0);
  const avgSpend = Math.round(totalSpent / Math.max(SESSIONS.length, 1));
  const profileCompletion =
    [form.firstName, form.lastName, form.email, form.phone].filter(
      (x) => String(x || "").trim().length > 0,
    ).length * 25;

  const visibleSessions = showAllRecent ? SESSIONS : SESSIONS.slice(0, 3);

  const saveProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setApiErr("Please login to update your profile");
      return;
    }
    setApiErr(null);
    setSaving(true);
    try {
      const { ok, data } = await apiFetch("/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
        }),
      });
      setSaving(false);
      if (!ok) {
        setApiErr(data?.message || "Failed to update profile");
        return;
      }
      if (data?.data) {
        setApiProfile(data.data);
        // Update sessionStorage with new name
        const sessionUser = JSON.parse(
          sessionStorage.getItem("valo_user") || "{}",
        );
        if (sessionUser) {
          const newName =
            `${form.firstName} ${form.lastName}`.trim() || sessionUser.name;
          sessionUser.name = newName;
          sessionStorage.setItem("valo_user", JSON.stringify(sessionUser));
          // Notify other components to refresh
          window.dispatchEvent(new Event("valo_auth_change"));
        }
      }
      setSaved(true);
      setIsFlipped(false);
      setTimeout(() => setSaved(false), 2400);
    } catch {
      setSaving(false);
      setApiErr("Network error. Please try again.");
    }
  };

  const inputStyle = (editable) => ({
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    outline: "none",
    background: editable ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${editable ? G15 : BD}`,
    color: editable ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
  });

  return (
    <div className="space-y-4">
      <style>{`
        .hub-wrap { perspective: 1200px; }
        .hub-flip { transform-style: preserve-3d; transition: transform .6s cubic-bezier(.2,.7,.2,1); }
        .hub-flip.is-flipped { transform: rotateY(180deg); }
        .hub-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .hub-back { transform: rotateY(180deg); }
      `}</style>

      {loading && (
        <div
          className="text-xs font-bold"
          style={{ color: "rgba(212,175,55,0.6)" }}
        >
          Syncing profile...
        </div>
      )}

      <div className="md:grid md:grid-cols-4 md:gap-4 flex gap-3 overflow-x-auto snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { label: "Sessions", value: user.totalSessions },
          { label: "Hours", value: `${user.totalHours}h` },
          { label: "Avg Cost", value: fmt(avgSpend) },
          { label: "Saved", value: `${user.savedPercent}%`, gold: true },
        ].map((m) => (
          <div
            key={m.label}
            className="min-w-[170px] md:min-w-0 snap-start rounded-2xl p-3 flex flex-col gap-1.5"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))",
              border: `1px solid ${m.gold ? G15 : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <span className="text-[10px] tracking-[0.14em] uppercase text-white/35 font-bold">
              {m.label}
            </span>
            <span
              className="text-xl font-black"
              style={{ color: m.gold ? G : "rgba(255,255,255,0.9)" }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 order-1 xl:order-2">
          <div className="xl:sticky xl:top-6 hub-wrap">
            <div
              className={`hub-flip relative min-h-[440px] sm:min-h-[470px] ${isFlipped ? "is-flipped" : ""}`}
            >
              <Panel className="hub-face absolute inset-0 !p-6">
                <button
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl grid place-items-center"
                  style={{
                    border: `1px solid ${G15}`,
                    color: G,
                    background: "rgba(255,255,255,0.04)",
                  }}
                  onClick={() => setIsFlipped(true)}
                >
                  <Edit2 size={14} />
                </button>
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div
                    className="w-24 h-24 rounded-full grid place-items-center text-3xl font-black mb-4"
                    style={{
                      border: `1px solid ${G15}`,
                      color: G,
                      background: "rgba(0,0,0,0.35)",
                    }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <p className="text-2xl font-black text-white/90 tracking-[0.08em] uppercase">
                    {displayName}
                  </p>
                  <p className="text-xs text-white/45 mt-2 uppercase tracking-[0.2em]">
                    VIP Member
                  </p>

                  <div className="w-full mt-6 space-y-2 text-left">
                    {[
                      ["Phone", form.phone || "--"],
                      ["Email", form.email || "--"],
                      ["Joined", user.memberSince || "Jan 2024"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between gap-3 py-1.5"
                      >
                        <span className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                          {k}
                        </span>
                        <span className="text-sm text-white/80 text-right truncate">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-[11px] text-white/35 uppercase tracking-[0.14em]">
                    Profile Completion {profileCompletion}%
                  </p>
                </div>
              </Panel>

              <Panel className="hub-face hub-back absolute inset-0 !p-6">
                <button
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl grid place-items-center"
                  style={{
                    border: `1px solid ${BD}`,
                    color: "rgba(255,255,255,0.65)",
                  }}
                  onClick={() => setIsFlipped(false)}
                >
                  <X size={14} />
                </button>
                <div className="h-full flex flex-col justify-center">
                  <h3 className="text-sm font-black text-white/90 tracking-[0.12em] uppercase mb-4">
                    Edit Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ["First Name", "firstName", "text"],
                      ["Last Name", "lastName", "text"],
                      ["Email", "email", "email"],
                      ["Phone", "phone", "tel"],
                    ].map(([label, key, type]) => {
                      const editable = key !== "email";
                      return (
                        <div key={key}>
                          <label className="block text-[10px] text-white/35 uppercase tracking-[0.12em] mb-1.5">
                            {label}
                          </label>
                          <input
                            style={inputStyle(editable)}
                            type={type}
                            value={form[key] || ""}
                            disabled={!editable}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, [key]: e.target.value }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${BD}`,
                        color: "rgba(255,255,255,0.7)",
                      }}
                      onClick={() => setIsFlipped(false)}
                      disabled={saving}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${G}, #AA771C)`,
                        color: "#000",
                      }}
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        "Saving..."
                      ) : (
                        <>
                          <Check size={14} /> Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4 order-2 xl:order-1">
          <Panel>
            <SectionTitle
              icon={Clock}
              action={
                <button
                  className="text-[10px] font-bold"
                  style={{ color: G }}
                  onClick={() => setShowAllRecent((v) => !v)}
                >
                  {showAllRecent ? "Collapse" : "View All"}
                </button>
              }
            >
              Recent Activity
            </SectionTitle>
            {visibleSessions.map((s, idx) => (
              <div key={s.id}>
                {idx > 0 && (
                  <div className="my-2" style={{ height: 1, background: BD }} />
                )}
                <div className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <p className="text-sm font-bold text-white/85 truncate">
                      {s.location}
                    </p>
                    <span className="text-[10px] text-white/35">{s.date}</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    {s.duration} • Spot {s.spot} • {s.vehicle}
                  </p>
                  <p className="text-xs font-black mt-2" style={{ color: G }}>
                    {fmt(s.cost)}
                  </p>
                </div>
              </div>
            ))}
          </Panel>

          {saved && (
            <div
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#34d399",
                background: "rgba(16,185,129,0.08)",
              }}
            >
              Profile updated successfully.
            </div>
          )}
          {apiErr && (
            <div
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#f87171",
                background: "rgba(239,68,68,0.08)",
              }}
            >
              {apiErr}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VehiclesPage() {
  const [vehicles] = useState(VEHICLES);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-white/90">My Vehicles</h1>
        <button
          className="px-3 py-2 rounded-xl text-xs font-bold"
          style={{ border: `1px solid ${G15}`, color: G }}
        >
          <Plus size={12} className="inline mr-1" /> Add
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vehicles.map((v) => (
          <Panel key={v.id}>
            <div className="flex justify-between gap-3 items-start">
              <div>
                <p className="text-base font-black" style={{ color: v.color }}>
                  {v.name}
                </p>
                <p className="text-xs text-white/35 mt-1">{v.type}</p>
              </div>
              <span className="text-xs text-white/70 font-bold">{v.plate}</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function WalletPage({ user }) {
  const [visible, setVisible] = useState(true);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white/90">Smart Wallet</h1>
      <Panel>
        <p className="text-[10px] tracking-[0.14em] uppercase text-white/35 mb-1">
          Available Balance
        </p>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-black" style={{ color: G }}>
            {visible ? fmt(user.wallet) : "d ••••••"}
          </span>
          <button
            onClick={() => setVisible((v) => !v)}
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="py-2.5 rounded-xl text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${G}, #AA771C)`,
              color: "#000",
            }}
          >
            <CreditCard size={13} className="inline mr-1" /> Top Up
          </button>
          <button
            className="py-2.5 rounded-xl text-xs font-bold"
            style={{
              border: `1px solid ${BD}`,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <ArrowUpRight size={13} className="inline mr-1" /> Transfer
          </button>
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon={Clock}>Transaction History</SectionTitle>
        {TRANSACTIONS.map((tx, i) => (
          <div key={tx.id}>
            {i > 0 && (
              <div className="my-2" style={{ height: 1, background: BD }} />
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {tx.amount > 0 ? (
                  <ArrowDownLeft size={14} style={{ color: "#34d399" }} />
                ) : (
                  <ArrowUpRight size={14} style={{ color: "#f87171" }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/80 truncate">
                    {tx.label}
                  </p>
                  <p className="text-[10px] text-white/35">{tx.date}</p>
                </div>
              </div>
              <p
                className="text-xs font-black"
                style={{ color: tx.amount > 0 ? "#34d399" : "#f87171" }}
              >
                {tx.amount > 0 ? "+" : ""}
                {fmt(tx.amount)}
              </p>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function ActivityPage() {
  const totalSpent = SESSIONS.reduce((sum, s) => sum + s.cost, 0);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white/90">Session Activity</h1>
      <Panel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
          <div>
            <p className="text-white/35">Sessions</p>
            <p className="font-black text-white/85">{SESSIONS.length}</p>
          </div>
          <div>
            <p className="text-white/35">Total Spend</p>
            <p className="font-black" style={{ color: G }}>
              {fmt(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-white/35">Top Location</p>
            <p className="font-black text-white/85">{SESSIONS[0].location}</p>
          </div>
          <div>
            <p className="text-white/35">Avg Cost</p>
            <p className="font-black text-white/85">
              {fmt(Math.round(totalSpent / SESSIONS.length))}
            </p>
          </div>
        </div>
        {SESSIONS.map((s, idx) => (
          <div key={s.id}>
            {idx > 0 && (
              <div className="my-2" style={{ height: 1, background: BD }} />
            )}
            <div className="text-sm text-white/85">{s.location}</div>
            <div className="text-[11px] text-white/35">
              {s.date} • {s.duration} • Spot {s.spot}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function NotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white/90">Notifications</h1>
      <Panel>
        {NOTIFICATIONS.map((n, i) => (
          <div key={n.id}>
            {i > 0 && (
              <div className="my-2" style={{ height: 1, background: BD }} />
            )}
            <p className="text-sm font-bold text-white/85">{n.title}</p>
            <p className="text-xs text-white/45 mt-1">{n.desc}</p>
            <p className="text-[10px] text-white/30 mt-1">{n.at}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function SecurityPage() {
  const [bio, setBio] = useState(true);
  const [alerts, setAlerts] = useState(true);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white/90">Security</h1>
      <Panel>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-white/85">
              Biometric Authentication
            </p>
            <p className="text-xs text-white/35">
              Use fingerprint or face unlock on this device.
            </p>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              border: `1px solid ${bio ? G15 : BD}`,
              color: bio ? G : "rgba(255,255,255,0.6)",
            }}
            onClick={() => setBio((v) => !v)}
          >
            {bio ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-white/85">Risk Alerts</p>
            <p className="text-xs text-white/35">
              Notify when unknown plate tries to enter.
            </p>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              border: `1px solid ${alerts ? G15 : BD}`,
              color: alerts ? G : "rgba(255,255,255,0.6)",
            }}
            onClick={() => setAlerts((v) => !v)}
          >
            {alerts ? "ON" : "OFF"}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white/90">Settings</h1>
      <Panel>
        <p className="text-sm font-semibold text-white/85">
          Profile Preferences
        </p>
        <p className="text-xs text-white/35 mt-1">
          Manage language, timezone, and communication preference.
        </p>
      </Panel>
    </div>
  );
}

function Sidebar({ active, onChange, user, onLogout, onClose }) {
  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderRight: `1px solid ${BD}`,
      }}
    >
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p
            className="text-sm font-black tracking-[0.2em]"
            style={{ color: G }}
          >
            VALO
          </p>
          <p className="text-[10px] text-white/35">SMART PARKING</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/60">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="px-3 pb-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const activeItem = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left"
              style={{
                border: `1px solid ${activeItem ? G15 : "rgba(255,255,255,0.03)"}`,
                color: activeItem ? G : "rgba(255,255,255,0.65)",
                background: activeItem
                  ? "rgba(212,175,55,0.08)"
                  : "transparent",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3">
        <div
          className="px-3 py-2 rounded-xl mb-2"
          style={{ border: `1px solid ${BD}`, background: SURF }}
        >
          <p className="text-sm font-bold text-white/85 truncate">
            {user.name}
          </p>
          <p className="text-[10px] text-white/35 truncate">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl text-sm font-bold"
          style={{ border: `1px solid rgba(239,68,68,0.2)`, color: "#f87171" }}
        >
          <LogOut size={14} className="inline mr-1" /> Logout
        </button>
      </div>
    </div>
  );
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("valo_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const user = {
    id: sessionUser?.id,
    name: sessionUser?.name || "Customer",
    email: sessionUser?.email || "customer@example.com",
    role: sessionUser?.role || "customer",
    phone: "+84 901 234 567",
    wallet: 2450000,
    totalSessions: SESSIONS.length,
    totalHours: 124,
    savedPercent: 78,
    memberSince: "Jan 2024",
  };

  const onLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("valo_user");
    navigate("/login");
  };

  const renderSection = () => {
    switch (section) {
      case "overview":
        return <ProfileOverview user={user} sessionUser={sessionUser} />;
      case "vehicles":
        return <VehiclesPage />;
      case "wallet":
        return <WalletPage user={user} />;
      case "activity":
        return <ActivityPage />;
      case "notifications":
        return <NotificationsPage />;
      case "security":
        return <SecurityPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ProfileOverview user={user} sessionUser={sessionUser} />;
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(1200px 600px at 90% -20%, rgba(212,175,55,0.15), transparent 55%), linear-gradient(135deg, #060606 0%, #111 40%, #090909 100%)",
      }}
    >
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-20">
        <Sidebar
          active={section}
          onChange={setSection}
          user={user}
          onLogout={onLogout}
        />
      </div>

      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-10 px-4 md:px-6 py-3"
          style={{
            background: "rgba(8,8,8,0.75)",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${BD}`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden w-9 h-9 rounded-xl grid place-items-center"
                style={{ border: `1px solid ${BD}` }}
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={16} />
              </button>
              <p className="text-sm md:text-base font-black tracking-[0.1em] uppercase text-white/90">
                {NAV_ITEMS.find((x) => x.id === section)?.label || "Profile"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className="px-2 py-1 rounded-full"
                style={{ border: `1px solid ${G15}`, color: G }}
              >
                {user.role}
              </span>
              <span className="hidden md:inline text-white/45">
                {user.email}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 pb-24 lg:pb-6">{renderSection()}</main>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <Sidebar
              active={section}
              onChange={(id) => {
                setSection(id);
                setMobileOpen(false);
              }}
              user={user}
              onLogout={onLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-20 px-3 py-2"
        style={{ background: "rgba(8,8,8,0.9)", borderTop: `1px solid ${BD}` }}
      >
        <div className="grid grid-cols-4 gap-1">
          {["overview", "vehicles", "wallet", "settings"].map((id) => {
            const item = NAV_ITEMS.find((x) => x.id === id);
            const Icon = item.icon;
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="py-2 rounded-xl text-[10px] font-bold"
                style={{
                  color: active ? G : "rgba(255,255,255,0.55)",
                  border: `1px solid ${active ? G15 : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <Icon size={14} className="mx-auto mb-1" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
