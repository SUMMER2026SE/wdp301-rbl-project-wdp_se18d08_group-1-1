import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  History,
  Wallet,
  ArrowLeftRight,
  Car,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  ArrowDownToLine,
  Send,
  ScanLine,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Camera,
  BarChart3,
  FileText,
  QrCode,
  ChevronRight,
  MoreHorizontal,
  X,
  CreditCard,
  Wallet as WalletIcon,
  Building2,
  Apple,
  Check,
  MapPin,
  Clock,
  Shield,
  User,
  Zap,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWalletInfo, getTransactionsHistory, createTopUpUrl, getTopUpStatus } from '../../services/walletService';
import Logo from '../../assets/images/logo.png';

const features = [
  { icon: ScanLine, title: 'Auto Parking Payment', desc: 'Drive in, drive out. We handle the rest.' },
  { icon: Camera, title: 'License Plate Detection', desc: 'AI cameras recognize your plate instantly.' },
  { icon: BarChart3, title: 'Smart Expense Analytics', desc: 'Real-time spending insights and forecasts.' },
  { icon: FileText, title: 'Monthly Parking Report', desc: 'Auto-generated reports delivered monthly.' },
];

const statusStyle = (status = '') => {
  const s = String(status).toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') return 'bg-[oklch(0.95_0.06_155)] text-[oklch(0.4_0.16_155)]';
  if (s === 'PENDING') return 'bg-[oklch(0.96_0.08_88)] text-[oklch(0.45_0.14_75)]';
  return 'bg-[oklch(0.96_0.04_25)] text-[oklch(0.5_0.2_25)]';
};

export default function WalletPage() {
  const [modal, setModal] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [pollingOrderCode, setPollingOrderCode] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const dynamicStats = [
    { label: 'Total Balance', value: `${wallet?.balance?.toLocaleString()} VNĐ`, change: 'Current balance', up: true, icon: Wallet },
    { label: 'Total Top Up', value: `${wallet?.totalTopUp?.toLocaleString()} VNĐ`, change: 'Lifetime top up', up: true, icon: TrendingUp },
    { label: 'Total Spent', value: `${wallet ? Math.abs(wallet.totalSpent).toLocaleString() : '0'} VNĐ`, change: 'Lifetime spent', up: false, icon: TrendingDown },
    { label: 'Total Refunded', value: `${wallet?.totalRefunded?.toLocaleString()} VNĐ`, change: 'Refunded amount', up: true, icon: Sparkles },
  ];

  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem('valo_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('valo_user');
    setUser(null);
    setProfileOpen(false);
    window.dispatchEvent(new Event('valo_auth_change'));
    window.location.href = '/';
  };

  const getInitials = (name = '') =>
    name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

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

  const grad = getGradient(user?.name || '');
  const roleBadge = {
    admin:    { label: 'Admin',    bg: 'bg-red-500',     text: 'text-white' },
    manager:  { label: 'Manager',  bg: 'bg-blue-500',    text: 'text-white' },
    customer: { label: 'Customer', bg: 'bg-emerald-500', text: 'text-white' },
  };

  const fetchWalletData = useCallback(async () => {
    try {
      const [walletRes, txsRes] = await Promise.all([
        getWalletInfo(),
        getTransactionsHistory({ limit: 5 })
      ]);
      
      if (walletRes.status === 401 || txsRes.status === 401) {
         // Token hết hạn => Xóa token cũ và đá về trang đăng nhập
         localStorage.removeItem('accessToken');
         localStorage.removeItem('refreshToken');
         window.location.href = '/login';
         return;
      }

      if (walletRes.ok) {
        const walletData = walletRes.data.data;
        setWallet(walletData);
        window.dispatchEvent(new CustomEvent('valo_balance_change', { detail: walletData.balance || 0 }));
      }
      if (txsRes.ok) setTxs(txsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling checks status payOS top-up order
  useEffect(() => {
    if (!pollingOrderCode) return;

    console.log(`Starting polling for order: ${pollingOrderCode}`);
    setVerifyingPayment(true);

    const intervalId = setInterval(async () => {
      try {
        const statusRes = await getTopUpStatus(pollingOrderCode);
        if (statusRes.ok) {
          const txStatus = statusRes.data?.data?.status;
          console.log(`Polling status for ${pollingOrderCode}: ${txStatus}`);

          if (txStatus === 'COMPLETED' || txStatus === 'SUCCESS' || txStatus === 'PAID') {
            clearInterval(intervalId);
            setPollingOrderCode(null);
            setVerifyingPayment(false);
            showToast('Nạp tiền thành công', 'success');
            fetchWalletData();
          } else if (txStatus === 'CANCELLED' || txStatus === 'FAILED') {
            clearInterval(intervalId);
            setPollingOrderCode(null);
            setVerifyingPayment(false);
            showToast('Thanh toán thất bại hoặc đã bị hủy', 'error');
            fetchWalletData();
          }
        }
      } catch (error) {
        console.error('Failed to verify top up status:', error);
      }
    }, 3000); // call every 3 seconds

    // Timeout after 5 minutes
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (pollingOrderCode) {
        setPollingOrderCode(null);
        setVerifyingPayment(false);
        showToast('Hết thời gian chờ thanh toán', 'warning');
        fetchWalletData();
      }
    }, 300000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [pollingOrderCode, fetchWalletData]);

  // Initial load check for query params redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderCode = urlParams.get('orderCode');
    const payosStatus = urlParams.get('status');
    const cancelFlag = urlParams.get('cancel');

    if (orderCode) {
      // Clear query params immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      if (cancelFlag === 'true' || payosStatus === 'CANCELLED') {
        // Call status check to let backend cancel the PENDING transaction in DB
        getTopUpStatus(orderCode).then(() => {
          showToast('Giao dịch đã bị hủy', 'error');
          fetchWalletData();
        }).catch(() => {
          showToast('Giao dịch đã bị hủy', 'error');
          fetchWalletData();
        });
      } else {
        // Payment may be successful — start polling to verify
        setPollingOrderCode(orderCode);
      }
    } else {
      fetchWalletData();
    }
  }, [fetchWalletData]);

  // Lock page scroll and interaction when modal is open
  useEffect(() => {
    if (modal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [modal]);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Payment verification overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center shadow-gold animate-pulse">
              <Zap className="w-8 h-8 text-neutral-900" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-neutral-900">Đang xác nhận thanh toán</h3>
              <p className="text-xs text-neutral-500 mt-1">Vui lòng chờ trong giây lát...</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10 flex items-center px-8 gap-4">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img src={Logo} alt="VALO" className="h-9 w-9 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-gray-900 leading-none">VALO</span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-gray-400 uppercase">Parking</span>
            </div>
          </Link>
          <div className="w-px h-8 bg-border mx-2" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Wallet</h1>
          </div>
          <div className="ml-8 relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search transactions, vehicles..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm border-0 outline-none focus:ring-2 focus:ring-ring/40 transition"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl gradient-dark text-primary-foreground shadow-soft">
              <Wallet className="w-4 h-4 text-gold" />
              <div className="text-xs opacity-70">Balance</div>
              <div className="text-sm font-semibold text-gradient-gold">
                {wallet?.balance?.toLocaleString()} VNĐ
              </div>
            </div>
            
            {/* Notification */}
            <button
              id="nav-notifications"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-all duration-200 nav-btn-hover"
              title="Notifications"
            >
              <Bell size={18} strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-[5px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                3
              </span>
            </button>

            {/* Profile Dropdown */}
            {user && (
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
                  <div className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-[11px] shadow-sm select-none shrink-0`}>
                    {getInitials(user.name)}
                  </div>
                  <span className="hidden sm:block text-[13px] font-semibold text-gray-700 max-w-[90px] truncate">
                    {user.name?.split(' ').pop()}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-gray-400 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* ─── DROPDOWN ─── */}
                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-white/100 backdrop-blur-2xl rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden z-50">
                    {/* User card */}
                    <div className="p-4 border-b border-gray-100/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shadow-lg select-none`}>
                          {getInitials(user.name)}
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
                            <p className="text-sm font-extrabold text-gray-800">{wallet ? wallet.balance.toLocaleString() : '0'}₫</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setProfileOpen(false); setModal("topup"); }}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all duration-200 uppercase tracking-wide flex items-center gap-1"
                        >
                          Top Up <ArrowUpRight size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="p-2 mt-1">
                      {[
                        { id: 'home',          icon: Sparkles,label: 'Back to Home',        to: '/' },
                        { id: 'profile',       icon: User,    label: 'Profile',             to: '/profile' },
                        { id: 'vehicles',      icon: Car,     label: 'My Vehicles',         to: '/my-vehicles' },
                        { id: 'transactions',  icon: History, label: 'Transaction History', to: '/wallet/history' },
                        { id: 'notifications', icon: Bell,    label: 'Notifications',       to: '/notifications' },
                        { id: 'policy',        icon: FileText,label: 'Policy',              to: '/policy' },
                      ].map(item => (
                        <Link
                          key={item.id}
                          to={item.to}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] transition-all duration-200 group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-gold/10 flex items-center justify-center transition-all duration-200">
                            <item.icon size={14} className="text-gray-400 group-hover:text-gold transition-colors duration-200" />
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}

                      <div className="h-px bg-gray-100 my-2 mx-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-red-600 hover:bg-red-50 transition-all duration-200 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors duration-200">
                          <LogOut size={14} />
                        </div>
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 space-y-6 overflow-auto">
          <div className="grid grid-cols-12 gap-6">
            <div
              className="col-span-7 relative rounded-3xl p-8 text-[#F7E7C1] overflow-hidden shadow-card group"
              style={{
                backgroundImage:
                  'radial-gradient(120% 120% at 95% 20%, rgba(200, 141, 46, 0.45) 0%, rgba(0, 0, 0, 0.9) 55%)',
              }}
            >
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(202,150,57,0.6),rgba(0,0,0,0))] opacity-60 blur-3xl group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-[radial-gradient(circle_at_center,rgba(202,150,57,0.35),rgba(0,0,0,0))] blur-3xl" />
              <div className="relative flex items-start justify-between mb-12">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60">Total Balance</div>
                  <div className="mt-2 text-5xl font-bold tracking-tight text-[#E2B34D]">
                    {wallet?.balance?.toLocaleString()} VNĐ
                  </div>
                  <div className="mt-2 text-xs text-white/70 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Top Up: {wallet?.totalTopUp?.toLocaleString()} VNĐ
                  </div>
                </div>
                <div className="glass rounded-2xl p-3 flex items-center gap-2">
                  <img src={Logo} alt="VALO" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="text-[10px] text-white/70 tracking-wider">VALO</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">Smart Parking</div>
                  </div>
                </div>
              </div>
              <div className="relative grid grid-cols-2 gap-3">
                {[
                  { icon: Plus, label: 'Top Up', key: "topup" },
                  { icon: ScanLine, label: 'Pay Parking', key: "pay" },
                ].map((b) => (
                  <button
                    key={b.label}
                    onClick={() => setModal(b.key)}
                    className="rounded-2xl p-4 flex flex-col items-center gap-2 border border-white/10 bg-white/5 hover:-translate-y-1 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#2A2114] flex items-center justify-center">
                      <b.icon className="w-4 h-4 text-[#E2B34D]" />
                    </div>
                    <span className="text-xs font-medium text-white/90">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-5 grid grid-cols-2 gap-4">
              {dynamicStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-3xl bg-card border border-border p-5 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-foreground" />
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-xl font-bold tracking-tight">{s.value}</div>
                  <div className={`mt-1 text-[11px] font-medium ${s.up ? 'text-[oklch(0.55_0.16_155)]' : 'text-[oklch(0.55_0.18_25)]'}`}>
                    {s.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7 rounded-3xl bg-card border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">Recent Transactions</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Last 30 days of parking activity</p>
                </div>
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium py-2">Time</th>
                    <th className="text-left font-medium py-2">Description</th>
                    <th className="text-right font-medium py-2">Amount</th>
                    <th className="text-right font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length > 0 ? txs.map((t, i) => {
                    const isPlus = t.type === 'TOP_UP' || t.type === 'REFUND';
                    const amtStr = `${isPlus ? '+' : '-'}${t.amount.toLocaleString()} VNĐ`;
                    const statusStr = t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase();
                    const displayTime = new Date(t.createdAt).toLocaleDateString('vi-VN') + ' ' + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr key={t._id || i} className="border-t border-border hover:bg-muted/40 transition">
                        <td className="py-3.5 text-xs text-muted-foreground">{displayTime}</td>
                        <td className="py-3.5 text-sm font-medium">{t.description}</td>
                        <td className={`py-3.5 text-sm font-semibold text-right ${isPlus ? 'text-[oklch(0.55_0.16_155)]' : ''}`}>
                          {amtStr}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusStyle(statusStr)}`}>
                            {statusStr}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có giao dịch nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="col-span-5 rounded-3xl bg-card border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Wallet Analytics</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Tổng quan hoạt động ví</p>
                </div>
              </div>

              {(() => {
                // Compute chart data from real transactions
                const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const now = new Date();
                const dailyAmounts = [0, 0, 0, 0, 0, 0, 0]; // Sun=0..Sat=6

                txs.forEach(t => {
                  const d = new Date(t.createdAt);
                  // Only count transactions from the last 7 days
                  const diffDays = (now - d) / (1000 * 60 * 60 * 24);
                  if (diffDays <= 7) {
                    dailyAmounts[d.getDay()] += t.amount;
                  }
                });

                // Reorder: Mon..Sun
                const ordered = [
                  { d: 'T2', v: dailyAmounts[1] },
                  { d: 'T3', v: dailyAmounts[2] },
                  { d: 'T4', v: dailyAmounts[3] },
                  { d: 'T5', v: dailyAmounts[4] },
                  { d: 'T6', v: dailyAmounts[5] },
                  { d: 'T7', v: dailyAmounts[6] },
                  { d: 'CN', v: dailyAmounts[0] },
                ];

                const maxVal = Math.max(...ordered.map(o => o.v), 1);
                const totalActivity = ordered.reduce((s, o) => s + o.v, 0);
                const daysWithActivity = ordered.filter(o => o.v > 0).length || 1;
                const todayIdx = now.getDay(); // 0=Sun
                const reorderedTodayIdx = todayIdx === 0 ? 6 : todayIdx - 1; // Map to Mon=0..Sun=6

                return (
                  <>
                    <div className="mt-4 flex items-baseline gap-2">
                      <div className="text-2xl font-bold tracking-tight">
                        {(wallet?.totalTopUp || 0).toLocaleString()} VNĐ
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Tổng nạp</div>
                    </div>
                    <div className="mt-6 h-44 flex items-end justify-between gap-2">
                      {ordered.map((b, i) => (
                        <div key={b.d} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full relative flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${
                                i === reorderedTodayIdx ? 'gradient-gold' : 'bg-muted'
                              }`}
                              style={{ height: `${b.v > 0 ? Math.max((b.v / maxVal) * 100, 8) : 3}%` }}
                            />
                          </div>
                          <span className={`text-[10px] ${i === reorderedTodayIdx ? 'text-gold-deep font-semibold' : 'text-muted-foreground'}`}>{b.d}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tổng chi</div>
                        <div className="text-sm font-semibold mt-0.5">{(wallet?.totalSpent || 0).toLocaleString()} VNĐ</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Giao dịch</div>
                        <div className="text-sm font-semibold mt-0.5">{txs.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Số dư</div>
                        <div className="text-sm font-semibold mt-0.5 text-gold-deep">{(wallet?.balance || 0).toLocaleString()} VNĐ</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {modal && (
        <ActionModal
          type={modal}
          walletDetails={wallet}
          onClose={() => setModal(null)}
          onStartPolling={(code) => setPollingOrderCode(code)}
        />
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl transition-all duration-300 border border-white/10 ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
            : toast.type === 'error'
            ? 'bg-rose-500 text-white shadow-rose-500/20'
            : 'bg-amber-500 text-neutral-900 shadow-amber-500/20'
        }`}>
          {toast.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0" />
          ) : (
            <Zap className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal shell ---------------- */
function ActionModal({ type, onClose, walletDetails, onStartPolling }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-lg animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[28px] bg-white text-neutral-900 shadow-xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl hover:bg-neutral-100 text-neutral-500 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
        {type === "topup" && <TopUpForm onClose={onClose} walletDetails={walletDetails} onStartPolling={onStartPolling} />}
        {type === "withdraw" && <WithdrawForm onClose={onClose} wallet={walletDetails} />}
        {type === "transfer" && <TransferForm onClose={onClose} />}
        {type === "pay" && <PayParkingForm onClose={onClose} walletDetails={walletDetails} />}
      </div>
    </div>
  );
}

/* ---------------- Top Up ---------------- */
function TopUpForm({ onClose, walletDetails, onStartPolling }) {
  const [amount, setAmount] = useState("10000"); // Standard is VNĐ maybe, but let's just let user type
  const [method, setMethod] = useState("payos");
  const [loading, setLoading] = useState(false);
  const quick = [50000, 100000, 200000, 500000];
  const methods = [
    { id: "payos", icon: Building2, label: "Bank Transfer App / QR", sub: "VietQR, Momo, ZaloPay (via payOS)" },
  ];

  const handleTopUp = async () => {
    if (!amount || Number(amount) < 1000) return alert('Minimum amount is 1000 VNĐ');
    setLoading(true);
    try {
      const res = await createTopUpUrl(Number(amount));
      if (res.status === 401) {
          alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return;
      }
      if (res.ok && res.data.data.checkoutUrl) {
        // Navigate in same tab — when payment is done, payOS redirects back to /wallet?orderCode=...
        window.location.href = res.data.data.checkoutUrl;
      } else {
        alert(res.data?.message || 'Error creating top up session');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center shadow-gold">
          <Plus className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Top Up Wallet</h2>
          <p className="text-xs text-neutral-500">Add funds to your VALO wallet</p>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-7 rounded-2xl gradient-dark text-white p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full gradient-gold opacity-30 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Amount</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gold">VNĐ</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="flex-1 bg-transparent text-4xl font-bold tracking-tight text-gradient-gold outline-none w-full min-w-0"
            />
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Current balance: {walletDetails?.balance?.toLocaleString()} VNĐ</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className={`py-2.5 rounded-xl text-xs font-semibold transition ${
              amount === String(q)
                ? "bg-neutral-900 text-white shadow-soft"
                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900"
            }`}
          >
            {(q / 1000)}k
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">Payment method</div>
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition text-left ${
                method === m.id
                  ? "border-gold bg-gold/5"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-700">
                <m.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-neutral-900">{m.label}</div>
                <div className="text-[11px] text-neutral-500">{m.sub}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                method === m.id ? "border-neutral-900 bg-neutral-900" : "border-neutral-200"
              }`}>
                {method === m.id && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={loading}
        className="mt-6 w-full gradient-gold text-neutral-900 py-3.5 rounded-2xl text-sm font-semibold shadow-gold hover:opacity-95 transition disabled:opacity-50"
        onClick={handleTopUp}
      >
        {loading ? 'Processing...' : `Confirm Top Up · ${amount ? Number(amount).toLocaleString() : "0"} VNĐ`}
      </button>

      <p className="mt-3 text-[11px] text-neutral-500 text-center flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" /> Secured with 256-bit encryption
      </p>
    </div>
  );
}

/* ---------------- Withdraw ---------------- */
function WithdrawForm({ onClose, wallet }) {
  const [amount, setAmount] = useState("50000");

  return (
    <div className="p-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
          <ArrowDownToLine className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Withdraw Funds</h2>
          <p className="text-xs text-muted-foreground">Move money to your bank</p>
        </div>
      </div>

      <div className="mt-7 p-5 rounded-2xl bg-muted">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</div>
        <div className="text-sm font-semibold mt-0.5">{wallet?.balance?.toLocaleString()} VNĐ</div>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Withdraw amount</div>
        <div className="mt-1 flex items-baseline gap-1">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="flex-1 bg-transparent text-4xl font-bold tracking-tight outline-none w-full min-w-0"
          />
          <span className="text-2xl font-bold ml-2">VNĐ</span>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-2xl border border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-dark text-primary-foreground flex items-center justify-center">
          <Building2 className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">VPBank •••• 8821</div>
          <div className="text-[11px] text-muted-foreground">Arrives in 1–2 business days</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>

      <button onClick={onClose} className="mt-6 w-full bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-semibold hover:opacity-90 transition">
        Withdraw {amount ? Number(amount).toLocaleString() : "0"} VNĐ
      </button>
    </div>
  );
}

/* ---------------- Transfer ---------------- */
function TransferForm({ onClose }) {
  const recents = [
    { name: "Linh Pham", id: "@linhp", color: "from-rose-300 to-rose-500" },
    { name: "Minh Tran", id: "@minht", color: "from-sky-300 to-sky-500" },
    { name: "Khoa Le", id: "@khoal", color: "from-emerald-300 to-emerald-500" },
    { name: "Vy Nguyen", id: "@vyn", color: "from-violet-300 to-violet-500" },
  ];

  return (
    <div className="p-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Send Money</h2>
          <p className="text-xs text-muted-foreground">Instant transfer to VALO users</p>
        </div>
      </div>

      <div className="mt-6 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search name, @username or phone"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Recent</div>
        <div className="grid grid-cols-4 gap-3">
          {recents.map((r) => (
            <button key={r.id} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} text-white font-semibold flex items-center justify-center group-hover:scale-105 transition`}>
                {r.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="text-[11px] font-medium leading-tight text-center">{r.name.split(" ")[0]}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</div>
        <div className="mt-1 flex items-baseline gap-1">
          <input defaultValue="50000" className="flex-1 bg-transparent text-2xl font-bold tracking-tight outline-none w-full min-w-0" />
          <span className="text-xl font-bold ml-2">VNĐ</span>
        </div>
        <input placeholder="Add a note (optional)" className="mt-2 w-full text-xs bg-transparent outline-none border-t border-border pt-2 text-muted-foreground" />
      </div>

      <button onClick={onClose} className="mt-6 w-full gradient-gold text-primary-foreground py-3.5 rounded-2xl text-sm font-semibold shadow-gold hover:opacity-95 transition">
        Send Transfer
      </button>
    </div>
  );
}

/* ---------------- Pay Parking ---------------- */
function PayParkingForm({ onClose, walletDetails }) {
  const [method, setMethod] = useState("wallet");

  return (
    <div className="p-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl gradient-gold flex items-center justify-center shadow-gold">
          <ScanLine className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Pay Parking</h2>
          <p className="text-xs text-neutral-500">Active session detected</p>
        </div>
      </div>

      {/* Active ticket */}
      <div className="mt-6 rounded-2xl gradient-dark text-white p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full gradient-gold opacity-30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Live session
            </div>
            <div className="text-[10px] font-mono text-neutral-400">#VL-8821</div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-4 h-4 text-gold" /> Sunset Plaza · Slot B-204
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-neutral-400 text-[10px] uppercase tracking-wider">Vehicle</div>
              <div className="mt-1 font-medium">51F-892.45</div>
            </div>
            <div>
              <div className="text-neutral-400 text-[10px] uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</div>
              <div className="mt-1 font-medium">2h 14m</div>
            </div>
            <div>
              <div className="text-neutral-400 text-[10px] uppercase tracking-wider">Rate</div>
              <div className="mt-1 font-medium">38,000 / hr</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-end justify-between">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Total</div>
            <div className="text-3xl font-bold text-gradient-gold">85,000 VNĐ</div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">Pay with</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "wallet", icon: WalletIcon, label: "VALO Wallet", sub: `${walletDetails?.balance?.toLocaleString()} VNĐ` },
            { id: "card", icon: CreditCard, label: "Visa", sub: "•••• 4221" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`p-3 rounded-2xl border text-left transition ${
                method === m.id ? "border-gold bg-gold/5" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <m.icon className="w-4 h-4 mb-2 text-gold-deep" />
              <div className="text-sm font-semibold text-neutral-900">{m.label}</div>
              <div className="text-[11px] text-neutral-500">{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-neutral-500 bg-neutral-50 rounded-xl p-3">
        <Zap className="w-3.5 h-3.5 text-gold-deep" />
        Auto-pay is enabled for this lot. Future visits charge instantly.
      </div>

      <button onClick={onClose} className="mt-5 w-full gradient-gold text-neutral-900 py-3.5 rounded-2xl text-sm font-semibold shadow-gold hover:opacity-95 transition">
        Pay 85,000 VNĐ Now
      </button>
    </div>
  );
}
