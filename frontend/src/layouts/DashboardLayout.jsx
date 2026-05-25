import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, ParkingCircle,
  Ticket, Wrench, BarChart2, DollarSign,
  // Manager icons
  MonitorCheck, Car, Gauge, FileWarning, ClipboardList,
  BookOpen, SlidersHorizontal,
  // Common
  Bell, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';

// ─── Nav configs per role ─────────────────────────────────────────────────────
const NAV_CONFIG = {
  admin: [
    { label: 'Overview',          icon: <LayoutDashboard size={18} />, to: '/admin/dashboard'           },
    { label: 'Manager Accounts',  icon: <Users size={18} />,           to: '/admin/managers'            },
    { label: 'User Management',   icon: <ShieldCheck size={18} />,     to: '/admin/users'               },
    { label: 'Parking Lots',      icon: <ParkingCircle size={18} />,   to: '/admin/parking-lots'        },
    { label: 'Ticket Packages',   icon: <Ticket size={18} />,          to: '/admin/tickets'             },
    { label: 'Services',          icon: <Wrench size={18} />,          to: '/admin/services'            },
    { label: 'Revenue Analytics', icon: <BarChart2 size={18} />,       to: '/admin/revenue'             },
    { label: 'Financial Export',  icon: <DollarSign size={18} />,      to: '/admin/financial'           },
  ],
  manager: [
    { label: 'Overview',          icon: <LayoutDashboard size={18} />, to: '/manager/dashboard'         },
    { label: 'Live Grid Monitor', icon: <MonitorCheck size={18} />,    to: '/manager/live-grid'         },
    { label: 'Gate Control',      icon: <Car size={18} />,             to: '/manager/gate'              },
    { label: 'Occupancy Reports', icon: <Gauge size={18} />,           to: '/manager/reports'           },
    { label: 'Booking Management',icon: <BookOpen size={18} />,        to: '/manager/bookings'          },
    { label: 'Parking Violations',icon: <FileWarning size={18} />,     to: '/manager/violations'        },
    { label: 'Task Status',       icon: <ClipboardList size={18} />,   to: '/manager/tasks'             },
    { label: 'Overtime Rates',    icon: <SlidersHorizontal size={18}/>,to: '/manager/rates'             },
  ],
};

const ROLE_THEME = {
  admin: {
    accent: 'from-yellow-400 to-yellow-600',
    activeBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    activeHover: 'hover:text-yellow-300',
    badge: { cls: 'bg-red-900/50 text-red-400', label: 'Admin' },
    panelLabel: 'Admin Panel',
    headerBadgeCls: 'bg-red-500/10 border-red-500/20 text-red-400',
  },
  manager: {
    accent: 'from-emerald-400 to-teal-600',
    activeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    activeHover: 'hover:text-emerald-300',
    badge: { cls: 'bg-emerald-900/50 text-emerald-400', label: 'Manager' },
    panelLabel: 'Manager Panel',
    headerBadgeCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
};

const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('valo_user') || '{}');
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const role = user?.role;
  const navItems = NAV_CONFIG[role] || [];
  const theme = ROLE_THEME[role] || ROLE_THEME.admin;

  // Close notif dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('valo_user');
    window.dispatchEvent(new Event('valo_auth_change'));
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex font-sans">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className={`
          ${collapsed ? 'w-[72px]' : 'w-60'}
          flex-shrink-0 bg-[#111111] border-r border-white/5
          flex flex-col transition-all duration-300 ease-in-out relative
          overflow-hidden
        `}
      >
        {/* Logo */}
        <div className="h-[70px] flex items-center px-4 border-b border-white/5 gap-3 shrink-0">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.accent}
              flex items-center justify-center text-black font-extrabold text-base
              shrink-0 shadow-lg`}
          >
            V
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-extrabold text-sm leading-tight whitespace-nowrap">VALO Parking</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest whitespace-nowrap">{theme.panelLabel}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                 transition-all duration-150 whitespace-nowrap overflow-hidden group
                 ${isActive
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

        {/* User section */}
        <div className={`border-t border-white/5 p-3 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.accent}
              flex items-center justify-center text-black font-extrabold text-sm shrink-0`}
          >
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-xs truncate">{user.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge.cls}`}>
                  {theme.badge.label}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="
            absolute -right-3 top-[82px]
            w-6 h-6 bg-[#1C1C1C] border border-white/10 rounded-full
            flex items-center justify-center
            text-gray-500 hover:text-white hover:border-white/30
            transition-all z-20
          "
        >
          {collapsed ? <ChevronDown size={11} className="-rotate-90" /> : <ChevronDown size={11} className="rotate-90" />}
        </button>
      </aside>

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-[70px] bg-[#111111] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden text-gray-500 hover:text-white"
            onClick={() => setCollapsed((c) => !c)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden lg:block" />

          {/* Right zone */}
          <div className="flex items-center gap-3">

            {/* Role badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme.headerBadgeCls}`}>
              <ShieldCheck size={13} />
              <span className="text-xs font-bold uppercase">{theme.badge.label}</span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-white font-bold text-sm">Notifications</p>
                  </div>
                  {[
                    { text: 'Gate B camera offline',       time: '3m ago',  dot: 'bg-yellow-400' },
                    { text: 'New booking #B-2041 created', time: '10m ago', dot: 'bg-green-400'  },
                    { text: 'Payment timeout – Slot A-07', time: '1h ago',  dot: 'bg-red-400'    },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.dot}`} />
                      <div>
                        <p className="text-gray-300 text-xs font-medium">{n.text}</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">{n.time}</p>
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
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0D0D0D]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
