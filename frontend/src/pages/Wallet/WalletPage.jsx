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
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (s === 'PENDING') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
};

const statusLabel = (status = '') => {
  const s = String(status).toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') return 'Completed';
  if (s === 'FAILED') return 'Failed';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'Cancelled';
  if (s === 'PENDING') return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const formatTransactionDescription = (transaction) => {
  const amount = Number(transaction?.amount || 0).toLocaleString('en-US');

  switch (transaction?.type) {
    case 'TOP_UP':
      return `Wallet top-up - ${amount} VND`;
    case 'PAYMENT':
      return transaction?.refSource === 'parking'
        ? `Parking payment - ${amount} VND`
        : `Payment - ${amount} VND`;
    case 'REFUND':
      return `Refund - ${amount} VND`;
    default:
      return transaction?.description || 'Transaction';
  }
};

export default function WalletPage() {
  const [modal, setModal] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
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
    { label: 'Total Balance', value: `${wallet?.balance?.toLocaleString()} VND`, change: 'Current balance', up: true, icon: Wallet },
    { label: 'Total Top Up', value: `${wallet?.totalTopUp?.toLocaleString()} VND`, change: 'Lifetime top up', up: true, icon: TrendingUp },
    { label: 'Total Spent', value: `${wallet ? Math.abs(wallet.totalSpent).toLocaleString() : '0'} VND`, change: 'Lifetime spent', up: false, icon: TrendingDown },
    { label: 'Total Refunded', value: `${wallet?.totalRefunded?.toLocaleString()} VND`, change: 'Refunded amount', up: true, icon: Sparkles },
  ];



  const fetchWalletData = useCallback(async (transactionLimit = 5) => {
    try {
      const [walletRes, txsRes] = await Promise.all([
        getWalletInfo(),
        getTransactionsHistory({ limit: transactionLimit })
      ]);
      
      if (walletRes.status === 401 || txsRes.status === 401) {
        // Token expired: clear credentials and redirect to login
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

  const handleToggleTransactions = useCallback(async () => {
    const nextShowAll = !showAllTransactions;
    setShowAllTransactions(nextShowAll);
    await fetchWalletData(nextShowAll ? 9999 : 5);
  }, [fetchWalletData, showAllTransactions]);

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
            showToast('Top-up completed successfully', 'success');
            fetchWalletData();
          } else if (txStatus === 'CANCELLED' || txStatus === 'FAILED') {
            clearInterval(intervalId);
            setPollingOrderCode(null);
            setVerifyingPayment(false);
            showToast('Payment failed or was cancelled', 'error');
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
        showToast('Payment timed out', 'warning');
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
        getTopUpStatus(orderCode, true).then(() => {
          showToast('Transaction was cancelled', 'error');
          fetchWalletData();
        }).catch(() => {
          showToast('Transaction was cancelled', 'error');
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
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Payment verification overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center shadow-gold animate-pulse">
              <Zap className="w-8 h-8 text-neutral-900" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Verifying payment</h3>
              <p className="text-xs text-neutral-500 mt-1">Please wait a moment...</p>
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
      
      <main className="flex-1 p-8 space-y-6 overflow-auto bg-gray-100 dark:bg-transparent text-gray-900 dark:text-white">
          <div className="grid grid-cols-12 gap-6">
            <div
              className="col-span-7 relative rounded-[28px] p-8 text-white overflow-hidden shadow-2xl flex flex-col justify-between min-h-[320px]"
              style={{
                background: 'linear-gradient(135deg, #131313 0%, #1A150B 50%, #3B2A10 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#D49526] opacity-10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D49526] opacity-10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="relative flex items-start justify-between z-10">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-2">Total Balance</div>
                  <div className="text-5xl font-bold tracking-tight text-[#D49526]">
                    {wallet?.balance?.toLocaleString() || '0'} VNĐ
                  </div>
                  <div className="mt-2 text-sm text-white/70 flex items-center gap-1 font-medium">
                    <TrendingUp className="w-4 h-4" /> +{(wallet?.totalTopUp || 0).toLocaleString()} VNĐ this month
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1">VALO • PRIME</div>
                </div>
              </div>
              
              <div className="relative grid grid-cols-2 gap-4 z-10 mt-12">
                {[
                  { icon: Plus, label: 'Top Up', key: "topup" },
                  { icon: ScanLine, label: 'Pay Parking', key: "pay" },
                ].map((b) => (
                  <button
                    key={b.label}
                    onClick={() => setModal(b.key)}
                    className="rounded-[20px] py-4 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-full border border-[#D49526]/30 flex items-center justify-center text-[#D49526]">
                      <b.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-5 grid grid-cols-2 gap-4">
              {[
                { icon: WalletIcon, label: 'Total Balance', value: `${wallet?.balance?.toLocaleString() || '0'} VNĐ`, change: '+12.4%', up: true },
                { icon: TrendingDown, label: 'Monthly Spending', value: `${(wallet?.totalSpent || 0).toLocaleString()} VNĐ`, change: '-3.2%', up: false },
                { icon: Car, label: 'Parking Payments', value: txs.length.toString(), change: '+8 this week', up: true },
                { icon: Sparkles, label: 'Cashback Rewards', value: '84,200 VNĐ', change: '+12,000 earned', up: true },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-[24px] bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/5">
                      <s.icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">{s.label}</div>
                    <div className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">{s.value}</div>
                    <div className={`mt-1 text-[11px] font-semibold ${s.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {s.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7 rounded-[24px] bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {showAllTransactions ? 'All available transactions' : 'Last 30 days of parking activity'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleTransactions}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  {showAllTransactions ? 'View less' : 'View all'} <ChevronRight className={`w-3 h-3 transition-transform ${showAllTransactions ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/5">
                    <th className="text-left font-medium py-3">Time</th>
                    <th className="text-left font-medium py-3">Description</th>
                    <th className="text-right font-medium py-3">Amount</th>
                    <th className="text-right font-medium py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length > 0 ? txs.map((t, i) => {
                    const isPlus = t.type === 'TOP_UP' || t.type === 'REFUND';
                    const amtStr = `${isPlus ? '+' : '-'}${t.amount.toLocaleString()} VND`;
                    const displayTime = new Date(t.createdAt).toLocaleDateString('en-US') + ' ' + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr key={t._id || i} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                        <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400">{displayTime}</td>
                        <td className="py-3.5 text-sm font-medium text-gray-900 dark:text-white">{formatTransactionDescription(t)}</td>
                        <td className={`py-3.5 text-sm font-semibold text-right ${isPlus ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                          {amtStr}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusStyle(t.status)}`}>
                            {statusLabel(t.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No transactions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="col-span-5 rounded-[24px] bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Wallet Analytics</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Wallet activity overview</p>
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
                      <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {(wallet?.totalTopUp || 0).toLocaleString()} VND
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total top-up</div>
                    </div>
                    <div className="mt-6 h-44 flex items-end justify-between gap-2">
                      {ordered.map((b, i) => (
                        <div key={b.d} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full relative flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${
                                i === reorderedTodayIdx ? 'bg-[#D49526]' : 'bg-gray-100 dark:bg-white/10'
                              }`}
                              style={{ height: `${b.v > 0 ? Math.max((b.v / maxVal) * 100, 8) : 3}%` }}
                            />
                          </div>
                          <span className={`text-[10px] ${i === reorderedTodayIdx ? 'text-[#D49526] font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{b.d}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/5 grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total spent</div>
                        <div className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-white">{(wallet?.totalSpent || 0).toLocaleString()} VND</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</div>
                        <div className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-white">{txs.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</div>
                        <div className="text-sm font-semibold mt-0.5 text-[#D49526]">{(wallet?.balance || 0).toLocaleString()} VND</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </main>

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
        className="relative w-full max-w-md rounded-[28px] bg-gradient-to-br from-black via-[#111111] to-[#1A1A1A] text-white shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
        {type === "topup" && <TopUpForm onClose={onClose} walletDetails={walletDetails} onStartPolling={onStartPolling} />}
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
    if (!amount || Number(amount) < 1000) return alert('Minimum amount is 1000 VND');
    setLoading(true);
    try {
      const res = await createTopUpUrl(Number(amount));
      if (res.status === 401) {
          alert('Your session has expired. Please sign in again.');
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return;
      }
      if (res.ok && res.data.data.checkoutUrl) {
        // Open in the same tab so payOS can redirect back to /wallet?orderCode=...
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#D49526] flex items-center justify-center shadow-lg shadow-[#D49526]/30">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Top Up Wallet</h2>
          <p className="text-[13px] text-white/65 font-medium">Add funds to your VALO wallet</p>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-7 rounded-[24px] bg-black border border-white/10 p-6 relative overflow-hidden shadow-2xl shadow-black/40">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#D49526] opacity-12 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold mb-1">Amount</div>
          <div className="mt-1 flex items-baseline gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="flex-1 bg-transparent text-[44px] font-bold tracking-tight text-white outline-none w-full min-w-0 placeholder:text-white/25"
              placeholder="0"
            />
            <span className="text-2xl font-bold text-white">VND</span>
          </div>
          <div className="text-[12px] text-white/65 mt-2 font-medium">Current balance: {walletDetails?.balance?.toLocaleString()} VND</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className={`py-3 rounded-2xl text-[14px] font-bold transition-all ${
              amount === String(q)
                ? "bg-[#D49526] text-white shadow-md"
                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            }`}
          >
            {(q / 1000)}k
          </button>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Payment method</div>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>
        <div className="space-y-3">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-[20px] border transition-all text-left ${
                method === m.id
                  ? "border-[#D49526] bg-white/10 shadow-sm"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <m.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-white">{m.label}</div>
                <div className="text-[12px] text-white/65 font-medium mt-0.5">{m.sub}</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                method === m.id ? "border-[#D49526] bg-[#D49526]" : "border-neutral-300 dark:border-neutral-600"
              }`}>
                {method === m.id && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={loading}
        className="mt-8 w-full bg-gradient-to-r from-[#D99A29] to-[#4A3111] text-white py-4 rounded-[20px] text-[15px] font-bold shadow-lg shadow-[#D49526]/20 hover:opacity-95 transition-all disabled:opacity-50"
        onClick={handleTopUp}
      >
        {loading ? 'Processing...' : `Confirm Top Up · ${amount ? Number(amount).toLocaleString() : "0"} VND`}
      </button>

      <p className="mt-4 text-[11px] text-white/55 font-medium text-center flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Secured with 256-bit encryption
      </p>
    </div>
  );
}

/* ---------------- Pay Parking ---------------- */
function PayParkingForm({ onClose, walletDetails }) {
  const [method, setMethod] = useState("wallet");

  return (
    <div className="p-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#D49526] flex items-center justify-center shadow-lg shadow-[#D49526]/40">
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Pay Parking</h2>
          <p className="text-xs text-white/65">Active session detected</p>
        </div>
      </div>

      {/* Active ticket */}
      <div className="mt-6 rounded-3xl bg-black border border-white/10 text-white p-6 relative overflow-hidden shadow-2xl shadow-black/40">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#D49526] opacity-12 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/65 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D49526] animate-pulse" /> Live session
            </div>
            <div className="text-[10px] font-mono text-white/55 font-medium">#VL-8821</div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-4 h-4 text-[#FFD54A]" /> <span className="text-white">Sunset Plaza · Slot B-204</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-white/55 text-[10px] uppercase tracking-wider font-medium">Vehicle</div>
              <div className="mt-1 font-semibold text-white">51F-892.45</div>
            </div>
            <div>
              <div className="text-white/55 text-[10px] uppercase tracking-wider flex items-center gap-1 font-medium"><Clock className="w-3 h-3" /> Duration</div>
              <div className="mt-1 font-semibold text-white">2h 14m</div>
            </div>
            <div>
              <div className="text-white/55 text-[10px] uppercase tracking-wider font-medium">Rate</div>
              <div className="mt-1 font-semibold text-white">38,000 / hr</div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-end justify-between">
            <div className="text-[10px] uppercase tracking-wider text-white/55 font-medium">Total</div>
            <div className="text-3xl font-bold text-[#FFD54A]">85,000 VND</div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-wider text-white/60 mb-3 font-medium">Pay with</div>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setMethod("wallet")}
            className="p-4 rounded-2xl border transition text-left border-[#D49526] bg-white/8"
          >
            <WalletIcon className="w-5 h-5 mb-2 text-[#D49526]" />
            <div className="text-sm font-bold text-white">VALO Wallet</div>
            <div className="text-[12px] text-white/65 font-medium mt-0.5">{walletDetails?.balance?.toLocaleString()} VND</div>
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-[11px] text-white/65 bg-white/5 rounded-xl p-3.5 font-medium border border-white/10">
        <Zap className="w-4 h-4 text-[#D49526] shrink-0" />
        Auto-pay is enabled for this lot. Future visits charge instantly.
      </div>

      <button onClick={onClose} className="mt-6 w-full bg-gradient-to-r from-[#D99A29] to-[#4A3111] text-white py-4 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#D49526]/20 hover:opacity-95 transition-all">
        Pay 85,000 VND Now
      </button>
    </div>
  );
}
