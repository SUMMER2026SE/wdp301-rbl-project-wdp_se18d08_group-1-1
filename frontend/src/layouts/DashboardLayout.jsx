import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import logoImg from "../assets/images/logo.png";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ParkingCircle,
  Ticket,
  Wrench,
  BarChart2,
  DollarSign,
  // Customer icons
  Home,
  User,
  Wallet,
  Settings,
  // Staff icons
  MonitorCheck,
  Car,
  Gauge,
  FileWarning,
  ClipboardList,
  BookOpen,
  SlidersHorizontal,
  // Common
  Bell,
  LogOut,
  Menu,
  ChevronDown,
} from "lucide-react";

// ─── Nav configs per role ─────────────────────────────────────────────────────
const NAV_CONFIG = {
  admin: [
    {
      label: "Overview",
      icon: <LayoutDashboard size={18} />,
      to: "/admin/dashboard",
    },
    {
      label: "Staff Accounts",
      icon: <Users size={18} />,
      to: "/admin/staff",
    },
    {
      label: "User Management",
      icon: <ShieldCheck size={18} />,
      to: "/admin/users",
    },
    {
      label: "Parking Lots",
      icon: <ParkingCircle size={18} />,
      to: "/admin/parking-lots",
    },
    {
      label: "Ticket Packages",
      icon: <Ticket size={18} />,
      to: "/admin/tickets",
    },
    { label: "Services", icon: <Wrench size={18} />, to: "/admin/services" },
    {
      label: "Vehicle Models",
      icon: <Car size={18} />,
      to: "/admin/vehicle-models",
    },
    {
      label: "Revenue Analytics",
      icon: <BarChart2 size={18} />,
      to: "/admin/revenue",
    },
    {
      label: "Financial Export",
      icon: <DollarSign size={18} />,
      to: "/admin/financial",
    },
    {
      label: "Profile",
      icon: <User size={18} />,
      to: "/admin/profile",
    },
  ],
  staff: [
    {
      label: "Overview",
      icon: <LayoutDashboard size={18} />,
      to: "/staff/dashboard",
    },
    {
      label: "Session Management",
      icon: <MonitorCheck size={18} />,
      to: "/staff/sessions",
    },
    { label: "Gate Control", icon: <Car size={18} />, to: "/staff/gate" },
    {
      label: "Occupancy Reports",
      icon: <Gauge size={18} />,
      to: "/staff/reports",
    },
    {
      label: "Booking Management",
      icon: <BookOpen size={18} />,
      to: "/staff/bookings",
    },
    {
      label: "Parking Violations",
      icon: <FileWarning size={18} />,
      to: "/staff/violations",
    },
    {
      label: "Task Status",
      icon: <ClipboardList size={18} />,
      to: "/staff/tasks",
    },
    {
      label: "Overtime Rates",
      icon: <SlidersHorizontal size={18} />,
      to: "/staff/rates",
    },
    {
      label: "Profile",
      icon: <User size={18} />,
      to: "/staff/profile",
    },
  ],
  customer: [
    { label: "Home", icon: <Home size={18} />, to: "/" },
    { label: "Profile", icon: <User size={18} />, to: "/profile" },
    { label: "My Vehicles", icon: <Car size={18} />, to: "/customer/vehicles" },
    { label: "Parking History", icon: <ClipboardList size={18} />, to: "/customer/history" },
    { label: "Wallet", icon: <Wallet size={18} />, to: "/customer/wallet" },
    {
      label: "Settings",
      icon: <Settings size={18} />,
      to: "/customer/settings",
    },
  ],
};

const ROLE_THEME = {
  admin: {
    accent: "from-yellow-400 to-yellow-600",
    activeBg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    activeHover: "hover:text-yellow-300",
    badge: { cls: "bg-red-900/50 text-red-400", label: "Admin" },
    panelLabel: "Admin Panel",
    headerBadgeCls: "bg-red-500/10 border-red-500/20 text-red-400",
  },
  staff: {
    accent: "from-emerald-400 to-teal-600",
    activeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    activeHover: "hover:text-emerald-300",
    badge: { cls: "bg-emerald-900/50 text-emerald-400", label: "Staff" },
    panelLabel: "Staff Panel",
    headerBadgeCls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  },
  customer: {
    accent: "from-yellow-400 to-yellow-600",
    activeBg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    activeHover: "hover:text-yellow-300",
    badge: { cls: "bg-yellow-900/50 text-yellow-400", label: "Customer" },
    panelLabel: "My Account",
    headerBadgeCls: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  },
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() =>
    JSON.parse(sessionStorage.getItem("valo_user") || "{}"),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const role = user?.role;
  const navItems = NAV_CONFIG[role] || [];
  const theme = ROLE_THEME[role] || ROLE_THEME.admin;
  const displayName = user
    ? [user.profile?.firstName, user.profile?.lastName]
        .filter(Boolean)
        .join(" ") ||
      user.username ||
      "User"
    : "User";

  // Always dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Listen for auth changes (including profile updates)
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(JSON.parse(sessionStorage.getItem("valo_user") || "{}"));
    };
    window.addEventListener("valo_auth_change", handleAuthChange);
    return () =>
      window.removeEventListener("valo_auth_change", handleAuthChange);
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("valo_user");
    window.dispatchEvent(new Event("valo_auth_change"));
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0D0D0D] flex font-sans transition-colors duration-300">
      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className={`
          ${collapsed ? "w-[72px]" : "w-60"}
          flex-shrink-0 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-white/5
          flex flex-col transition-all duration-300 ease-in-out relative
          z-40
        `}
      >
        {/* Logo */}
        <div className="h-[70px] flex items-center px-4 border-b border-gray-200 dark:border-white/5 gap-3 shrink-0">
          {/* Icon */}
          <img
            src={logoImg}
            alt="Valo Parking"
            className="w-9 h-9 object-contain shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden leading-none">
              <p
                className="
                  text-[13px] font-black tracking-[0.18em] whitespace-nowrap
                  bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600
                  bg-clip-text text-transparent
                "
              >
                VALO PARKING
              </p>
              <p className="text-[9px] font-semibold tracking-[0.25em] text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap mt-0.5">
                {theme.panelLabel}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split("/").length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                 transition-all duration-150 whitespace-nowrap overflow-hidden group
                 ${
                   isActive
                     ? `${theme.activeBg} border`
                     : `text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent`
                 }`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="
            absolute -right-3 top-[82px]
            w-6 h-6 bg-gray-100 dark:bg-[#1C1C1C] border border-gray-200 dark:border-white/10 rounded-full
            flex items-center justify-center
            text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/30
            transition-all z-20
          "
        >
          {collapsed ? (
            <ChevronDown size={11} className="-rotate-90" />
          ) : (
            <ChevronDown size={11} className="rotate-90" />
          )}
        </button>
      </aside>

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[70px] bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setCollapsed((c) => !c)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden lg:block" />

          {/* Right zone */}
          <div className="flex items-center gap-3">
            {/* Role badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme.headerBadgeCls}`}
            >
              <ShieldCheck size={13} />
              <span className="text-xs font-bold uppercase">
                {theme.badge.label}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={17} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                    <p className="text-gray-900 dark:text-white font-bold text-sm">
                      Notifications
                    </p>
                  </div>
                  {[
                    {
                      text: "Gate B camera offline",
                      time: "3m ago",
                      dot: "bg-yellow-400",
                    },
                    {
                      text: "New booking #B-2041 created",
                      time: "10m ago",
                      dot: "bg-green-400",
                    },
                    {
                      text: "Payment timeout – Slot A-07",
                      time: "1h ago",
                      dot: "bg-red-400",
                    },
                  ].map((n, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 cursor-pointer"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.dot}`}
                      />
                      <div>
                        <p className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {n.text}
                        </p>
                        <p className="text-gray-400 dark:text-gray-600 text-[10px] mt-0.5">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.accent}
                flex items-center justify-center text-black font-extrabold text-sm cursor-pointer`}
              title={displayName}
            >
              {getInitials(displayName)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#0D0D0D] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
