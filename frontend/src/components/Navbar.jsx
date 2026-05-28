import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, User, Wallet, ChevronDown, Bell, Car, CalendarCheck,
  Map, FileText, Menu, X, Shield, History, Sparkles, Settings,
  CircleParking, ArrowUpRight, CreditCard
} from 'lucide-react';
import Logo from '../assets/images/logo.png';

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   VALO PARKING ΓÇô Premium Navbar
   Phase 1: Expanded transparent bar at top
   Phase 2: Floating glass pill when scrolled
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

const guestLinks = [
  { to: '/',            label: 'Home',        icon: Sparkles },
  { to: '/services',    label: 'Services',    icon: Settings },
  { to: '/parking-map', label: 'Parking Map', icon: Map },
  { to: '/policy',      label: 'Policy',      icon: FileText },
];

const customerLinks = [
  { to: '/',            label: 'Home',         icon: Sparkles },
  { to: '/booking',     label: 'Booking',      icon: CalendarCheck },
  { to: '/parking-map', label: 'Parking Map',  icon: Map },
  { to: '/wallet',      label: 'Wallet',       icon: Wallet },
];

const roleBadge = {
  admin:    { label: 'Admin',    bg: 'bg-red-500',     text: 'text-white' },
  manager:  { label: 'Manager',  bg: 'bg-blue-500',    text: 'text-white' },
  customer: { label: 'Customer', bg: 'bg-emerald-500', text: 'text-white' },
};

const avatarGradients = [
  'from-violet-500 to-fuchsia-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
  'from-rose-500 to-pink-600',
  'from-emerald-400 to-teal-600',
  'from-indigo-500 to-purple-600',
];

const getGradient = (name = '') => {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarGradients[h % avatarGradients.length];
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount] = useState(3);
  const [scrollY, setScrollY] = useState(0);
  const profileRef = useRef(null);

  // ΓöÇΓöÇ Sync user ΓöÇΓöÇ
  const syncUser = useCallback(() => {
    const raw = sessionStorage.getItem('valo_user');
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => {
    syncUser();
    window.addEventListener('focus', syncUser);
    window.addEventListener('valo_auth_change', syncUser);
    return () => {
      window.removeEventListener('focus', syncUser);
      window.removeEventListener('valo_auth_change', syncUser);
    };
  }, [syncUser]);

  // ΓöÇΓöÇ Scroll detection ΓöÇΓöÇ
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ΓöÇΓöÇ Close on outside click ΓöÇΓöÇ
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ΓöÇΓöÇ Close on route change ΓöÇΓöÇ
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location.pathname]);

  // ΓöÇΓöÇ Logout ΓöÇΓöÇ
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('valo_user');
    setUser(null);
    setProfileOpen(false);
    window.dispatchEvent(new Event('valo_auth_change'));
    navigate('/');
  };

  const getInitials = (name = '') =>
    name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const navLinks = user ? customerLinks : guestLinks;
  const grad = getGradient(user?.name || '');
  const isScrolled = scrollY > 40;

  return (
    <>
      <nav
        id="main-navbar"
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* ΓöÇΓöÇΓöÇ Outer wrapper: adds margin + pill shape when scrolled ΓöÇΓöÇΓöÇ */}
        <div
          className="transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            margin: isScrolled ? '16px 5% 0' : '0',
            borderRadius: isScrolled ? '100px' : '0',
            background: isScrolled
              ? 'rgba(253, 251, 247, 0.85)' /* Soft premium warm tint */
              : 'rgba(255,255,255,0.95)',
            backdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'blur(12px)',
            WebkitBackdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'blur(12px)',
            boxShadow: isScrolled
              ? '0 10px 40px rgba(0,0,0,0.06), 0 2px 10px rgba(212,175,55,0.05), inset 0 1px 0 rgba(255,255,255,0.8)'
              : '0 1px 0 rgba(0,0,0,0.04)',
            border: isScrolled
              ? '1px solid rgba(212,175,55,0.15)' /* Subtle gold border */
              : '1px solid transparent',
          }}
        >
          <div
            className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between transition-all duration-500"
            style={{ height: isScrolled ? '52px' : '72px' }}
          >

            {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ LOGO ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" id="nav-logo">
              <div className="relative">
                <img
                  src={Logo}
                  alt="VALO"
                  className="object-contain transition-all duration-500 h-9 w-9"
                />
                <div className="absolute inset-0 rounded-full bg-gold/30 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500" />
              </div>
              <div className="hidden sm:flex flex-col overflow-hidden transition-all duration-500">
                <span className="text-sm font-black tracking-wider text-gray-900 leading-none whitespace-nowrap">VALO</span>
                <span className="text-[9px] font-bold tracking-[0.25em] text-gray-400 uppercase whitespace-nowrap">Parking</span>
              </div>
            </Link>

            {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ CENTER NAV ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center gap-0.5 relative">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    id={`nav-${link.label.replace(/\s+/g, '-').toLowerCase()}`}
                    className="relative"
                  >
                    {({ isActive }) => (
                      <div
                        className={`
                          relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold
                          transition-all duration-300 ease-out cursor-pointer select-none
                          ${isActive
                            ? 'text-gray-900'
                            : 'text-gray-500 hover:text-gray-800'}
                        `}
                      >
                        {/* Active bg pill */}
                        {isActive && (
                          <span className="absolute inset-0 rounded-xl bg-gray-900/[0.06] nav-active-bg" />
                        )}

                        <link.icon
                          size={14}
                          strokeWidth={2.2}
                          className={`relative z-10 transition-colors duration-300 ${
                            isActive ? 'text-gold' : 'text-gray-400'
                          }`}
                        />
                        <span className="relative z-10">{link.label}</span>

                        {/* Active dot */}
                        {isActive && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-gold nav-dot-enter" />
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ RIGHT ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
            <div className="flex items-center gap-1.5">

              {user ? (
                <>
                  {/* Notification */}
                  <button
                    id="nav-notifications"
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-all duration-200 nav-btn-hover"
                    title="Notifications"
                  >
                    <Bell size={18} strokeWidth={2} />
                    {notifCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-[5px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                        {notifCount > 9 ? '9+' : notifCount}
                      </span>
                    )}
                  </button>

                  {/* Profile */}
                  <div className="relative" ref={profileRef}>
                    <button
                      id="nav-profile-btn"
                      onClick={() => setProfileOpen(o => !o)}
                      className={`
                        flex items-center gap-2 pl-[3px] pr-2.5 py-[3px] rounded-2xl
                        transition-all duration-300 nav-btn-hover
                        ${profileOpen
                          ? 'bg-black/[0.06] ring-1 ring-black/[0.08]'
                          : 'hover:bg-black/[0.04]'}
                      `}
                    >
                      <div className={`w-8 h-8 rounded-[10px] overflow-hidden ${user.avatar ? '' : `bg-gradient-to-br ${grad}`} flex items-center justify-center text-white font-bold text-[11px] shadow-sm select-none shrink-0`}>
                        {user.avatar
                          ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          : getInitials(user.name)
                        }
                      </div>
                      <span className="hidden sm:block text-[13px] font-semibold text-gray-700 max-w-[90px] truncate">
                        {user.name?.split(' ').pop()}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-gray-400 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* ΓöÇΓöÇΓöÇ DROPDOWN ΓöÇΓöÇΓöÇ */}
                    {profileOpen && (
                      <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-white/80 backdrop-blur-2xl rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border border-white/60 overflow-hidden nav-dropdown-enter">

                        {/* User card */}
                        <div className="p-4 border-b border-gray-100/80">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl overflow-hidden ${user.avatar ? '' : `bg-gradient-to-br ${grad}`} flex items-center justify-center text-white font-bold text-sm shadow-lg select-none`}>
                              {user.avatar
                                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                : getInitials(user.name)
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                            </div>
                            {roleBadge[user.role] && (
                              <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${roleBadge[user.role].bg} ${roleBadge[user.role].text} shadow-sm`}>
                                {roleBadge[user.role].label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Wallet card */}
                        <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/60">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200/60">
                                <CreditCard size={14} className="text-white" />
                              </div>
                              <div>
                                <p className="text-[10px] text-amber-600/70 font-semibold uppercase tracking-wider">Balance</p>
                                <p className="text-sm font-extrabold text-gray-800">{(user.wallet || 0).toLocaleString('vi-VN')}Γé½</p>
                              </div>
                            </div>
                            <Link
                              to="/wallet"
                              onClick={() => setProfileOpen(false)}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all duration-200 uppercase tracking-wide flex items-center gap-1"
                            >
                              Top Up <ArrowUpRight size={10} />
                            </Link>
                          </div>
                        </div>

                        {/* Menu */}
                        <div className="p-2 mt-1">
                          {[
                            { id: 'profile',       icon: User,    label: 'Profile',             to: '/profile' },
                            { id: 'transactions',  icon: History, label: 'Transaction History', to: '/wallet/history' },
                            { id: 'notifications', icon: Bell,    label: 'Notifications',       to: '/notifications' },
                            { id: 'policy',        icon: FileText,label: 'Policy',              to: '/policy' },
                          ].map(item => (
                            <Link
                              key={item.id}
                              id={`nav-dd-${item.id}`}
                              to={item.to}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-gold/10 flex items-center justify-center transition-all duration-200">
                                <item.icon size={14} className="text-gray-400 group-hover:text-gold transition-colors duration-200" />
                              </div>
                              <span className="font-medium">{item.label}</span>
                            </Link>
                          ))}

                          {(user.role === 'admin' || user.role === 'manager') && (
                            <>
                              <div className="h-px bg-gray-100 my-1 mx-3" />
                              <Link
                                id="nav-dd-dashboard"
                                to={`/${user.role}/dashboard`}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] transition-all duration-200 group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-all duration-200">
                                  <Shield size={14} className="text-blue-500" />
                                </div>
                                <span className="font-medium">{user.role === 'admin' ? 'Admin' : 'Manager'} Panel</span>
                                <ArrowUpRight size={12} className="text-gray-300 ml-auto" />
                              </Link>
                            </>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100/80 p-2">
                          <button
                            id="nav-btn-logout"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50/80 transition-all duration-200 font-semibold"
                          >
                            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                              <LogOut size={14} className="text-red-400" />
                            </div>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ΓöÇΓöÇ GUEST ΓöÇΓöÇ */
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    id="nav-btn-login"
                    className="hidden sm:flex items-center px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-black/[0.04] transition-all duration-200"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/login"
                    id="nav-btn-signup"
                    className="relative group px-5 py-2 rounded-xl text-[13px] font-bold overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 group-hover:from-gold group-hover:via-yellow-400 group-hover:to-gold transition-all duration-500" />
                    <span className="relative flex items-center gap-1.5 text-white group-hover:text-gray-900 transition-colors duration-500">
                      Get Started
                      <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </Link>
                </div>
              )}

              {/* Mobile toggle */}
              <button
                id="nav-mobile-toggle"
                onClick={() => setMobileOpen(o => !o)}
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] transition-all duration-200"
              >
                <div className="relative w-5 h-5">
                  <span className={`absolute left-0 w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? 'top-[9px] rotate-45' : 'top-1'}`} />
                  <span className={`absolute left-0 top-[9px] w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 translate-x-2' : 'opacity-100'}`} />
                  <span className={`absolute left-0 w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? 'top-[9px] -rotate-45' : 'top-[17px]'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ MOBILE OVERLAY ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 w-[300px] h-full bg-white/95 backdrop-blur-2xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Close */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <img src={Logo} alt="VALO" className="h-7 w-7 object-contain" />
              <span className="text-sm font-black tracking-wider text-gray-900">VALO</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Links */}
          <div className="p-4 space-y-1">
            {navLinks.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                id={`nav-m-${link.label.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gold/10 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {({ isActive }) => (
                  <>
                    <link.icon size={18} className={isActive ? 'text-gold' : 'text-gray-400'} />
                    {link.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile auth */}
          {!user && (
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-gray-100 bg-white/80 backdrop-blur-xl space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-3 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Log In
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-3 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition shadow-lg"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile user card */}
          {user && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/80 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl overflow-hidden ${user.avatar ? '' : `bg-gradient-to-br ${grad}`} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    : getInitials(user.name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
