import { useState, useEffect } from 'react';
import { Loader2, Search, Filter, RefreshCw, Crown } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, expired, pending, etc.
  const [transfers, setTransfers] = useState([]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      
      const [res, transferRes] = await Promise.all([
        apiFetch(`/subscriptions/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiFetch('/admin/membership-entitlement-transfers', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      
      if (res.ok && res.data?.success) {
        setSubscriptions(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to fetch subscriptions');
      }
      if (transferRes.ok && transferRes.data?.success) {
        setTransfers(transferRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const reviewTransfer = async (transferId, approved) => {
    const token = localStorage.getItem('accessToken');
    const rejectionReason = approved
      ? ''
      : window.prompt('Rejection reason:')?.trim();
    if (!approved && !rejectionReason) return;
    const response = await apiFetch(
      `/admin/membership-entitlement-transfers/${transferId}/${approved ? 'approve' : 'reject'}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: approved ? undefined : JSON.stringify({ reason: rejectionReason }),
      }
    );
    if (!response.ok || !response.data?.success) {
      setError(response.data?.message || 'Unable to review transfer.');
      return;
    }
    await fetchSubscriptions();
  };

  useEffect(() => {
    const timerId = window.setTimeout(fetchSubscriptions, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const userName = sub.user?.username?.toLowerCase() || '';
    const userEmail = sub.user?.email?.toLowerCase() || '';
    
    const matchesSearch = userName.includes(searchLower) || 
                          userEmail.includes(searchLower);
                          
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">Active</span>;
      case 'expired':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/50">Expired</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50">Pending</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/50">Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/50">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen text-slate-200">
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-400" />
            VIP Memberships
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            View and manage customer subscriptions and VIP parking slots.
          </p>
        </div>
        
        <button 
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition shadow-lg border border-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <select
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/50 transition appearance-none text-sm text-slate-300"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-white/5 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-white">Membership transfer reviews</h2>
            <p className="mt-1 text-xs text-slate-500">
              Only recipient-accepted requests can be approved.
            </p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            {transfers.filter((item) => item.status === 'PENDING_ADMIN').length} pending
          </span>
        </div>
        <div className="space-y-2">
          {transfers.filter((item) => item.status === 'PENDING_ADMIN').length === 0 ? (
            <p className="rounded-xl bg-slate-800/40 p-4 text-sm text-slate-500">
              No transfer is waiting for review.
            </p>
          ) : (
            transfers
              .filter((item) => item.status === 'PENDING_ADMIN')
              .map((transfer) => (
                <div
                  key={transfer._id}
                  className="flex flex-col gap-3 rounded-xl border border-white/5 bg-slate-800/40 p-4 lg:flex-row lg:items-center"
                >
                  <div className="flex-1">
                    <p className="font-bold text-slate-200">
                      {transfer.entitlementId?.slotCode || 'Parking space'} ·{' '}
                      {transfer.fromUserId?.email} → {transfer.toUserId?.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Price {Number(transfer.askingPrice || 0).toLocaleString('vi-VN')} VND ·
                      Fee {Number(transfer.transferFee || 0).toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewTransfer(transfer._id, false)}
                      className="rounded-lg border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-400"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewTransfer(transfer._id, true)}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950"
                    >
                      Approve & lock 24h
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Package</th>
                <th className="p-4 font-medium">VIP Slots</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Period</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No subscriptions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map(sub => (
                  <tr key={sub._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{sub.user?.username || 'Unknown User'}</div>
                      <div className="text-xs text-slate-500">{sub.user?.email || 'No email'}</div>
                      {sub.user?.vehicles && sub.user.vehicles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sub.user.vehicles.map(plate => (
                            <span key={plate} className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono font-medium">
                              {plate}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-200 font-medium">{sub.ticketPackage?.name || 'Unknown Package'}</div>
                      <div className="text-xs text-slate-500 capitalize mt-1">{sub.ticketPackage?.type} package</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {sub.slots && sub.slots.length > 0 ? sub.slots.map(slot => (
                          <span key={`${slot.floorId?._id || slot.floorId}-${slot.slotCode}`} className="px-2 py-1 text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md font-mono font-bold">
                            {slot.floorId?.name || 'Floor'} - {slot.slotCode}
                          </span>
                        )) : (
                          <span className="text-slate-500 text-xs italic">No slots</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">
                      {sub.amount?.toLocaleString('vi-VN')} VND
                      <div className="text-[10px] text-slate-500 mt-1 uppercase">
                        {sub.paymentStatus}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">From:</span> {new Date(sub.validFrom).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        <span className="text-slate-500">To:</span> {new Date(sub.expireAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(sub.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
