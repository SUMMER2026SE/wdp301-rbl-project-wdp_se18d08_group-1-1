import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../../services/api";
import {
  Car,
  Camera,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

const formatVND = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

// ─── Map raw API response → UI profile state ─────────────────────────────────
const buildProfile = (raw) => {
  const p = raw.profile || {};
  const firstName = p.firstName || raw.firstName || "";
  const lastName = p.lastName || raw.lastName || "";
  const name =
    [firstName, lastName].filter(Boolean).join(" ") || raw.username || "User";
  return {
    name,
    firstName,
    lastName,
    phone: p.phone || raw.phone || "",
    email: raw.email || "",
    avatar: p.avatar || raw.avatar || "",
    role: raw.role || "Customer",
    wallet: raw.wallet || { balance: 0 },
    vehicles: raw.vehicles || [],
  };
};

// ─── Inline-editable field ────────────────────────────────────────────────────
function EditableField({ field, label, value, goldText = false, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave(field, draft);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Label */}
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold select-none">
        {label}
      </p>

      {isEditing ? (
        /* ── Edit mode ─────────────────────────────────────────────────────── */
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className={`
              w-full rounded-lg px-3 py-1.5 text-sm font-bold outline-none
              border transition-all duration-200
              bg-gray-100 border-gray-300 text-gray-900
              focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20
              dark:bg-black/50 dark:border-white/20 dark:text-white
              dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20
              ${goldText ? "text-yellow-500 dark:text-yellow-400" : ""}
            `}
          />
          <button
            onClick={save}
            className="text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors shrink-0"
            title="Save"
          >
            <Check size={15} />
          </button>
          <button
            onClick={cancel}
            className="text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 transition-colors shrink-0"
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* ── Display mode ───────────────────────────────────────────────────── */
        <div className="flex items-center gap-2 min-h-[28px]">
          <p
            className={`text-base font-bold leading-tight
              ${
                goldText
                  ? "text-yellow-500 dark:text-yellow-400"
                  : "text-gray-900 dark:text-white"
              }`}
          >
            {value || (
              <span className="text-gray-400 font-normal italic text-sm">
                —
              </span>
            )}
          </p>
          <button
            onClick={() => {
              setDraft(value);
              setIsEditing(true);
            }}
            className={`
              text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400
              transition-all duration-200
              ${isHovering ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"}
            `}
            title={`Edit ${label}`}
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const avatarInputRef = useRef(null);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    avatar: "",
    role: "Customer",
    wallet: { balance: 0 },
    vehicles: [],
  });

  // ── Other UI state ─────────────────────────────────────────────────────────
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [toast, setToast] = useState(null);

  // ── Fetch user data on mount ───────────────────────────────────────────────
  useEffect(() => {
    const fetchUserData = async () => {
      // Show cached data immediately so page doesn't flicker on navigation
      const cached = JSON.parse(sessionStorage.getItem("valo_user") || "null");
      if (cached) setProfile(buildProfile(cached));

      // Always refresh from the real API
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const { ok, data } = await apiFetch("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ok && data?.success) {
        setProfile(buildProfile(data.data));
        // Keep cache fresh so quick back-navigation is instant
        sessionStorage.setItem("valo_user", JSON.stringify(data.data));
      }
    };
    fetchUserData();
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Save profile field → real API ──────────────────────────────────────────
  const handleSaveProfile = async (field, value) => {
    // Optimistic UI update
    const updated = { ...profile, [field]: value };
    if (field === "name") {
      const spaceIdx = value.lastIndexOf(" ");
      updated.firstName = spaceIdx > 0 ? value.slice(0, spaceIdx) : value;
      updated.lastName = spaceIdx > 0 ? value.slice(spaceIdx + 1) : "";
    }
    setProfile(updated);
    setToast({ msg: "Saving...", type: "saving" });

    const token = localStorage.getItem("accessToken");
    if (!token) {
      showToast("Not authenticated", "error");
      return;
    }

    const { ok, data } = await apiFetch("/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
      }),
    });

    if (ok && data?.success) {
      const fresh = buildProfile(data.data);
      setProfile(fresh);
      sessionStorage.setItem("valo_user", JSON.stringify(data.data));
      window.dispatchEvent(new Event("valo_auth_change"));
      setToast({ msg: "Profile updated ✓", type: "success" });
      setTimeout(() => setToast(null), 2000);
    } else {
      // Rollback on error
      setProfile(profile);
      showToast(data?.message || "Update failed", "error");
    }
  };

  // ── Avatar upload — instant preview (API skeleton) ─────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfile((prev) => ({ ...prev, avatar: URL.createObjectURL(file) }));
    showToast("Avatar updated ✓", "success");
    // TODO: const fd = new FormData(); fd.append("avatar", file);
    // TODO: await api.post("/user/avatar", fd);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 md:py-14">
      {/* ══ Section: Avatar + Info ══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-10 mb-12">
        {/* Avatar */}
        <div className="relative shrink-0 group">
          <div className="absolute inset-0 bg-yellow-500/20 blur-[80px] rounded-full scale-150 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
          <label
            htmlFor="avatar-upload"
            className="
              relative block w-36 h-36 sm:w-40 sm:h-40 rounded-full
              cursor-pointer overflow-hidden p-1.5
              bg-black/5 dark:bg-white/5 backdrop-blur-md
              ring-2 ring-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.55)]
              group-hover:shadow-[0_0_44px_rgba(234,179,8,0.85)]
              transition-all duration-300
              ring-offset-4 ring-offset-gray-100 dark:ring-offset-[#0D0D0D]
            "
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover border-2 border-yellow-400/30"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center text-black font-extrabold text-3xl sm:text-4xl border-2 border-yellow-400/30">
                {getInitials(profile.name)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1">
              <Camera size={24} className="text-yellow-400" />
              <span className="text-yellow-400 text-[9px] font-bold tracking-wider uppercase">
                Change
              </span>
              <span className="text-yellow-400 text-[9px] font-bold tracking-wider uppercase">
                Avatar
              </span>
            </div>
          </label>
          <input
            id="avatar-upload"
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-yellow-400/20 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
        </div>

        {/* Info */}
        <div className="flex-1 w-full text-center sm:text-left">
          <div className="mb-5">
            <EditableField
              field="name"
              label="Name"
              value={profile.name}
              onSave={handleSaveProfile}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <EditableField
              field="phone"
              label="Phone Number"
              value={profile.phone}
              onSave={handleSaveProfile}
            />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold select-none">
                Email
              </p>
              <p className="text-base font-bold leading-tight text-gray-900 dark:text-white min-h-[28px]">
                {profile.email || (
                  <span className="text-gray-400 font-normal italic text-sm">
                    —
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Section: Widgets ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Wallet */}
        <div className="relative rounded-2xl p-6 border group cursor-pointer bg-white dark:bg-white/[0.04] backdrop-blur-md border-gray-200 dark:border-white/10 hover:border-yellow-500/30 hover:shadow-[0_0_32px_rgba(234,179,8,0.15)] transition-all duration-300">
          <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/15 transition-colors">
                <CreditCard size={16} className="text-yellow-400" />
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Wallet
              </span>
            </div>
            <button
              onClick={() => setBalanceHidden((h) => !h)}
              className="text-gray-400 hover:text-yellow-400 transition-colors p-1"
              title={balanceHidden ? "Show balance" : "Hide balance"}
            >
              {balanceHidden ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tracking-wider">
            {balanceHidden ? (
              <span className="text-gray-400 tracking-[0.2em]">••• •</span>
            ) : (
              formatVND(profile.wallet.balance)
            )}
          </p>
        </div>

        {/* My Vehicles */}
        <div className="relative rounded-2xl p-6 border group cursor-pointer bg-white dark:bg-white/[0.04] backdrop-blur-md border-gray-200 dark:border-white/10 hover:border-yellow-500/30 hover:shadow-[0_0_32px_rgba(234,179,8,0.15)] transition-all duration-300">
          <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/15 transition-colors">
              <Car size={16} className="text-yellow-400" />
            </div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              My Vehicles
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {profile.vehicles.length}{" "}
            <span className="text-sm font-normal text-gray-400">Vehicles</span>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]
            flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold
            shadow-2xl backdrop-blur-md border transition-all duration-300
            ${
              toast.type === "saving"
                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                : toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/15 text-red-300 border-red-500/30"
            }
          `}
        >
          {toast.type === "saving" && (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
