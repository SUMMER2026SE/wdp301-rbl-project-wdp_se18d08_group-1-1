import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  User,
  Car,
  Wallet,
  Settings,
  Moon,
  Sun,
  Camera,
  LogOut,
  Pencil,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  CreditCard,
} from "lucide-react";

// ─── Seed / dummy data ────────────────────────────────────────────────────────
const DUMMY_USER = {
  name: "Nguyễn Văn A",
  role: "Customer",
  phone: "+84 90 123 4567",
  email: "nguyenvana@gmail.com",
  avatar:
    "https://ui-avatars.com/api/?name=Nguyen+Van+A&background=1a1a1a&color=D4AF37&size=400&bold=true&font-size=0.38",
  wallet: { balance: 2_450_000 },
  vehicles: [
    { id: 1, plate: "30A-888.88", type: "Car" },
    { id: 2, plate: "51G-123.45", type: "Motorbike" },
  ],
};

const NAV_ITEMS = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Profile", icon: User, to: "/profile" },
  { label: "Vehicle", icon: Car, to: "/customer/vehicles" },
  { label: "Wallet", icon: Wallet, to: "/customer/wallet" },
  { label: "Setting", icon: Settings, to: "/customer/settings" },
];

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

// ─── Logo — shared between sidebar & topbar ───────────────────────────────────
function Logo({ textSize = "text-[14px]", vSize = "text-3xl" }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`${vSize} font-extrabold text-yellow-500 leading-none shrink-0`}
      >
        V
      </span>
      <span
        className={`${textSize} font-extrabold leading-tight whitespace-nowrap
          bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300
          bg-clip-text text-transparent`}
      >
        VALO PARKING
      </span>
    </div>
  );
}

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

// ─── Password field row ───────────────────────────────────────────────────────
function PwField({ label, value, show, onChange, onToggleShow }) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1.5 font-semibold select-none">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          className="
            w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10
            border transition-all duration-200
            bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400
            focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20
            dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-600
            dark:focus:border-yellow-500/50 dark:focus:ring-yellow-500/20
          "
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    avatar: "",
    role: "Customer",
    wallet: { balance: 0 },
    vehicles: [],
  });

  // ── Dark-mode — initialise from localStorage (matches anti-FOUC script) ────
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("valo_theme") !== "light",
  );

  // ── Other UI state ─────────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [toast, setToast] = useState(null);

  // ── Fetch user data on mount (API skeleton) ────────────────────────────────
  useEffect(() => {
    const fetchUserData = async () => {
      // TODO: replace with → const res = await api.get("/user/profile");
      const session = JSON.parse(sessionStorage.getItem("valo_user") || "null");
      await new Promise((r) => setTimeout(r, 300));

      if (session) {
        const name  = session.name  ?? session.fullName  ?? DUMMY_USER.name;
        const email = session.email ?? DUMMY_USER.email;
        const phone = session.phone ?? session.phoneNumber ?? DUMMY_USER.phone;
        // Avatar: prefer session value, then generate from actual name, fallback to DUMMY
        const avatar =
          session.avatar ??
          session.avatarUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a1a&color=D4AF37&size=400&bold=true&font-size=0.38`;

        setProfile({ ...DUMMY_USER, name, email, phone, avatar });
      } else {
        setProfile(DUMMY_USER);
      }
    };
    fetchUserData();
  }, []);

  // ── Dark mode — sync <html> class + persist to localStorage ───────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("valo_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Save profile field (API skeleton) ─────────────────────────────────────
  const handleSaveProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setToast({ msg: "Saving...", type: "saving" });
    // TODO: await api.patch("/user/profile", { [field]: value });
    setTimeout(() => {
      setToast({ msg: "Profile updated ✓", type: "success" });
      setTimeout(() => setToast(null), 2000);
    }, 700);
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

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem("valo_user");
    window.dispatchEvent(new Event("valo_auth_change"));
    navigate("/login");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // SIDEBAR (desktop >= md)
  // ───────────────────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <aside
      className="
        hidden md:flex w-52 flex-col flex-shrink-0 min-h-screen sticky top-0 z-30
        bg-white shadow-lg border-r border-gray-200
        dark:bg-[#141414] dark:shadow-none dark:border-white/10
        transition-colors duration-300
      "
    >
      {/* Logo */}
      <div className="h-[70px] flex items-center px-5 shrink-0 border-b border-gray-200 dark:border-white/10">
        <Logo />
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
               transition-all duration-150 whitespace-nowrap border
               ${
                 isActive
                   ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:text-yellow-400"
                   : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/5"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={`shrink-0 ${isActive ? "text-yellow-500 dark:text-yellow-400" : ""}`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — user chip + action buttons */}
      <div className="border-t border-gray-200 dark:border-white/10 p-3 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-xs shrink-0">
          {getInitials(profile.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-bold text-xs truncate leading-tight">
            {profile.name}
          </p>
          <p className="text-gray-400 text-[10px]">{profile.role}</p>
        </div>
        {/* Sun = in dark mode → click for light | Moon = in light mode → click for dark */}
        <button
          onClick={toggleDarkMode}
          className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all shrink-0 p-2 rounded-full"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all shrink-0 p-2 rounded-full"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // BOTTOM NAV (mobile)
  // ───────────────────────────────────────────────────────────────────────────
  const renderBottomNav = () => (
    <nav
      className="
        md:hidden fixed bottom-0 left-0 right-0 z-50
        bg-white/95 border-t border-gray-200
        dark:bg-[#141414]/95 dark:border-white/10
        backdrop-blur-md flex items-center justify-around px-1 py-2
        transition-colors duration-300
      "
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-[44px]
             ${
               isActive
                 ? "text-yellow-500 dark:text-yellow-400"
                 : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
             }`
          }
        >
          {() => (
            <>
              <item.icon size={20} />
              <span className="text-[9px] font-semibold mt-0.5">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex font-sans transition-colors duration-300">
      {renderSidebar()}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {/* Mobile topbar */}
        <div
          className="
            md:hidden h-14 sticky top-0 z-20
            bg-white border-b border-gray-200
            dark:bg-[#141414] dark:border-white/10
            flex items-center justify-between px-4
            transition-colors duration-300
          "
        >
          <Logo textSize="text-xs" vSize="text-2xl" />
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all p-2 rounded-full"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all p-2 rounded-full"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* ── Page body ──────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 md:py-14">
          {/* ══ Section: Avatar + Info ══════════════════════════════════════════ */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-10 mb-12">
            {/* Avatar ──────────────────────────────────────────────────────── */}
            <div className="relative shrink-0 group">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-yellow-500/20 blur-[80px] rounded-full scale-150 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />

              <label
                htmlFor="avatar-upload"
                className="
                  relative block w-36 h-36 sm:w-40 sm:h-40 rounded-full
                  cursor-pointer overflow-hidden p-1.5
                  bg-white/5 backdrop-blur-md
                  ring-2 ring-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.55)]
                  animate-ringGlow
                  group-hover:shadow-[0_0_44px_rgba(234,179,8,0.85)]
                  transition-all duration-300
                  ring-offset-4 ring-offset-gray-50 dark:ring-offset-[#0a0a0a]
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
                {/* Camera overlay on hover */}
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

            {/* User info ───────────────────────────────────────────────────── */}
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
                <EditableField
                  field="email"
                  label="Email"
                  value={profile.email}
                  onSave={handleSaveProfile}
                />
              </div>

              {/* Change Password accordion */}
              <div>
                <button
                  onClick={() => setPwOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-yellow-500 hover:text-yellow-400 dark:hover:text-yellow-300 text-sm font-semibold transition-colors mx-auto sm:mx-0"
                >
                  <Lock size={13} />
                  <span>Change Password</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-300 ${pwOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out
                    ${pwOpen ? "max-h-[440px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}
                >
                  <div
                    className="
                      rounded-2xl p-5 space-y-3 border
                      bg-gray-100 border-gray-200
                      dark:bg-white/[0.04] dark:backdrop-blur-md dark:border-white/10
                    "
                  >
                    <PwField
                      label="Current Password"
                      value={pwForm.current}
                      show={showPw.current}
                      onChange={(e) =>
                        setPwForm((p) => ({ ...p, current: e.target.value }))
                      }
                      onToggleShow={() =>
                        setShowPw((p) => ({ ...p, current: !p.current }))
                      }
                    />
                    <PwField
                      label="New Password"
                      value={pwForm.next}
                      show={showPw.next}
                      onChange={(e) =>
                        setPwForm((p) => ({ ...p, next: e.target.value }))
                      }
                      onToggleShow={() =>
                        setShowPw((p) => ({ ...p, next: !p.next }))
                      }
                    />
                    <PwField
                      label="Confirm New Password"
                      value={pwForm.confirm}
                      show={showPw.confirm}
                      onChange={(e) =>
                        setPwForm((p) => ({ ...p, confirm: e.target.value }))
                      }
                      onToggleShow={() =>
                        setShowPw((p) => ({ ...p, confirm: !p.confirm }))
                      }
                    />
                    <button className="w-full mt-1 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-bold py-2.5 rounded-xl text-sm transition-colors duration-150">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ Section: Widgets ════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Wallet widget */}
            <div
              className="
                relative rounded-2xl p-6 border group cursor-pointer
                bg-white border-gray-200 shadow-sm
                hover:border-yellow-400/50 hover:shadow-[0_0_28px_rgba(234,179,8,0.12)]
                dark:bg-white/[0.04] dark:backdrop-blur-md dark:border-white/10 dark:shadow-none
                dark:hover:border-yellow-500/30 dark:hover:shadow-[0_0_32px_rgba(234,179,8,0.15)]
                transition-all duration-300
              "
            >
              <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/15 transition-colors">
                    <CreditCard
                      size={16}
                      className="text-yellow-500 dark:text-yellow-400"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Wallet
                  </span>
                </div>
                <button
                  onClick={() => setBalanceHidden((h) => !h)}
                  className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors p-1"
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

            {/* My Vehicles widget */}
            <div
              className="
                relative rounded-2xl p-6 border group cursor-pointer
                bg-white border-gray-200 shadow-sm
                hover:border-yellow-400/50 hover:shadow-[0_0_28px_rgba(234,179,8,0.12)]
                dark:bg-white/[0.04] dark:backdrop-blur-md dark:border-white/10 dark:shadow-none
                dark:hover:border-yellow-500/30 dark:hover:shadow-[0_0_32px_rgba(234,179,8,0.15)]
                transition-all duration-300
              "
            >
              <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/15 transition-colors">
                  <Car
                    size={16}
                    className="text-yellow-500 dark:text-yellow-400"
                  />
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  My Vehicles
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {profile.vehicles.length}{" "}
                <span className="text-sm font-normal text-gray-400">
                  Vehicles
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {renderBottomNav()}

      {/* ── Toast notification ────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`
            fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[200]
            flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold
            shadow-2xl backdrop-blur-md border transition-all duration-300
            ${
              toast.type === "saving"
                ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300"
                : toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
                  : "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300"
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
