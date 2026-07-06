import { Fragment, useEffect, useMemo, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Car,
  Check,
  ChevronDown,
  Clock,
  Edit3,
  Eye,
  History,
  Lock,
  RefreshCw,
  Search,
  Shield,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { apiFetch } from '../../services/api';

const PAGE_SIZE = 10;

const ROLES = {
  customer: {
    label: 'Customer',
    gradient: 'from-[#ffd555] to-amber-500',
    bg: 'bg-[#ffd555]/15',
    border: 'border-[#ffd555]/40',
    text: 'text-[#ffd555]',
    dot: 'bg-[#ffd555]',
  },
};

function RoleBadge({ role = 'customer' }) {
  const cfg = ROLES[role] || ROLES.customer;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const active = status === true || status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
      active
        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
        : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {active ? 'Active' : 'Blocked'}
    </span>
  );
}

function VerifyBadge({ verified }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
      verified
        ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
        : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
    }`}>
      {verified ? <UserCheck size={12} /> : <Clock size={12} />}
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, gradient, loading }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className={`absolute -right-7 -top-7 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
          <p className="text-3xl font-bold text-white">{loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-white/10" /> : value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {[180, 190, 100, 110, 90, 70].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 animate-pulse rounded-lg bg-white/5" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#171B20]/95 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ffd555]/85">
          <Icon size={15} />
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
          <p className="mt-1 break-words text-sm font-medium text-white/90">{value || 'N/A'}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/40">
      {children}
    </div>
  );
}

const escapeTerm = (value) => String(value || '').trim().toLowerCase();
const normalizePlate = (value) => escapeTerm(value).replace(/[\s.-]/g, '');
const fullName = (u) => `${u?.profile?.firstName || ''} ${u?.profile?.lastName || ''}`.trim() || u?.username || u?.email || '-';
const initials = (u) => fullName(u).charAt(0).toUpperCase();
const isActive = (u) => u?.status === true || u?.status === 'active';

const formatDate = (value, withTime = false) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export default function AccountManagement() {
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}` }), []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [panelUser, setPanelUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveState, setSaveState] = useState('idle');
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 2600);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint = searchTerm.trim()
        ? `/staff/customers/search?keyword=${encodeURIComponent(searchTerm.trim())}`
        : '/staff/customers';
      let res = await apiFetch(endpoint, { headers: authHeader });
      if (!res.ok && endpoint !== '/staff/users') {
        res = await apiFetch('/staff/users', { headers: authHeader });
      }
      if (res.ok && res.data?.success) {
        setUsers((res.data.data || []).filter((user) => user.role === 'customer'));
      } else {
        showToast(res.data?.message || 'Failed to load customers', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Cannot load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchUsers, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const mergeUser = (updated) => {
    if (!updated?._id) return;
    setUsers((prev) => prev.map((user) => (user._id === updated._id ? { ...user, ...updated } : user)));
    setPanelUser((prev) => (prev?._id === updated._id ? { ...prev, ...updated } : prev));
  };

  const loadCustomerDetail = async (customer) => {
    if (!customer || customer.role !== 'customer') {
      showToast('Staff can only view customer accounts', 'error');
      return;
    }
    setPanelUser(customer);
    setIsEditing(false);
    setBlockConfirm(false);
    setSaveState('idle');
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/staff/customers/${customer._id}`, { headers: authHeader });
      if (res.ok && res.data?.success) {
        setPanelUser(res.data.data);
        mergeUser(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePanel = () => {
    setPanelUser(null);
    setIsEditing(false);
    setBlockConfirm(false);
    setBlockReason('');
  };

  const startEdit = (customer = panelUser) => {
    const selected = customer?.nativeEvent ? panelUser : customer;
    if (!selected || selected.role !== 'customer') {
      showToast('Staff can only edit customer accounts', 'error');
      return;
    }
    setPanelUser(selected);
    setEditForm({
      fullName: fullName(selected),
      email: selected.email || '',
      phone: selected.profile?.phone || '',
      status: isActive(selected) ? 'active' : 'blocked',
      emailVerified: selected.isEmailVerified ?? selected.emailVerified ?? false,
      licensePlate: selected.vehicle?.licensePlate || selected.vehicles?.[0]?.licensePlate || '',
      address: selected.profile?.address || '',
      role: 'customer',
    });
    setIsEditing(true);
    setSaveState('idle');
    setBlockConfirm(false);
  };

  const handleSave = async () => {
    const name = editForm.fullName?.trim() || '';
    if (!name) {
      showToast('Full name is required', 'error');
      return;
    }
    if (editForm.phone) {
      const cleanPhone = editForm.phone.replace(/[\s-]/g, '');
      if (!/^(03|05|07|08|09)\d{8}$/.test(cleanPhone)) {
        showToast('Please enter a valid Vietnamese phone number', 'error');
        return;
      }
    }

    const [firstName, ...rest] = name.split(/\s+/);
    const payload = {
      firstName,
      lastName: rest.join(' '),
      phone: editForm.phone || '',
      role: 'customer',
      status: editForm.status === 'active',
    };

    if (editForm.licensePlate) payload.licensePlate = editForm.licensePlate;

    setSaveState('saving');
    try {
      const res = await apiFetch(`/staff/customers/${panelUser._id}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(payload),
      });
      if (res.ok && res.data?.success) {
        mergeUser(res.data.data);
        setPanelUser(res.data.data);
        setIsEditing(false);
        setSaveState('success');
        showToast('Customer updated successfully');
        return;
      }
      setSaveState('error');
      showToast(res.data?.message || 'Failed to update customer', 'error');
    } catch (error) {
      console.error(error);
      setSaveState('error');
      showToast('An error occurred while saving', 'error');
    }
  };

  const updateStatus = async (customer, nextStatus, reason = '') => {
    if (!customer || customer.role !== 'customer') return;
    try {
      const res = await apiFetch(`/staff/customers/${customer._id}/status`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      if (res.ok && res.data?.success) {
        mergeUser(res.data.data);
        setPanelUser(res.data.data);
        setBlockConfirm(false);
        setBlockReason('');
        showToast(nextStatus ? 'Customer unblocked successfully' : 'Customer blocked successfully');
      } else {
        showToast(res.data?.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Cannot update customer status', 'error');
    }
  };

  const handleBlockConfirm = () => {
    if (!blockReason.trim()) {
      showToast('Please enter a block reason', 'error');
      return;
    }
    updateStatus(panelUser, false, blockReason.trim());
  };

  const filtered = useMemo(() => {
    const term = escapeTerm(searchTerm);
    const plateTerm = normalizePlate(searchTerm);
    return users
      .filter((user) => {
        const name = escapeTerm(fullName(user));
        const plates = [user.vehicle, ...(user.vehicles || [])].map((vehicle) => normalizePlate(vehicle?.licensePlate)).join(' ');
        const matchesSearch = !term
          || name.includes(term)
          || escapeTerm(user.email).includes(term)
          || escapeTerm(user.username).includes(term)
          || escapeTerm(user.profile?.phone).includes(term)
          || plates.includes(plateTerm);
        const matchesStatus = filterStatus === 'all'
          || (filterStatus === 'active' && isActive(user))
          || (filterStatus === 'blocked' && !isActive(user));
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const diff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return sortOrder === 'newest' ? diff : -diff;
      });
  }, [users, searchTerm, filterStatus, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pendingCount = users.filter((u) => !(u.isEmailVerified ?? u.emailVerified)).length;
  const vehicle = panelUser?.vehicle || panelUser?.vehicles?.[0] || null;

  return (
    <div className="staff-customer-management relative flex h-[calc(100vh-70px)] overflow-hidden bg-[#080808] text-white">
      <style>{`
        .staff-customer-management * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        .staff-customer-management *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .staff-customer-management *::-webkit-scrollbar-track,
        .staff-customer-management *::-webkit-scrollbar-corner {
          background: transparent;
        }
        .staff-customer-management *::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.16);
          border-radius: 999px;
        }
        .staff-customer-management *::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 213, 85, 0.35);
        }
      `}</style>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#080808] px-8 pb-6 pt-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#ffd555]">Customer Management</h1>
              <p className="mt-0.5 text-sm text-white/40">Manage VALO Parking customer profiles and operations</p>
            </div>
            <button onClick={fetchUsers} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Total Customers" value={users.length} gradient="from-cyan-400 to-blue-500" loading={loading} />
            <StatCard icon={UserPlus} label="New This Month" value={users.filter((u) => {
              const date = new Date(u.createdAt);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length} gradient="from-emerald-400 to-teal-500" loading={loading} />
            <StatCard icon={UserX} label="Blocked Customers" value={users.filter((u) => !isActive(u)).length} gradient="from-rose-500 to-red-600" loading={loading} />
            <StatCard icon={Clock} label="Pending Verify" value={pendingCount} gradient="from-amber-400 to-orange-500" loading={loading} />
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-4 bg-[#080808] px-8 py-4">
          <div className="relative min-w-[260px] flex-1 max-w-xl">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search email, phone, full name, username, license plate..."
              className="w-full rounded-full border border-white/[0.08] bg-[#111] py-2.5 pl-10 pr-4 text-sm text-white shadow-inner transition placeholder:text-white/30 focus:border-[#ffd555]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd555]/30"
            />
          </div>

          <Menu as="div" className="relative z-30 inline-block text-left">
            <Menu.Button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.03] hover:text-white">
              <Eye size={14} className="text-white/40" />
              {filterStatus === 'all' ? 'All Status' : filterStatus === 'active' ? 'Active' : 'Blocked'}
              <ChevronDown size={14} className="text-white/40" />
            </Menu.Button>
            <Transition as={Fragment} enter="transition ease-out duration-150" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Menu.Items className="absolute left-0 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#111] p-1.5 shadow-2xl focus:outline-none">
                {['all', 'active', 'blocked'].map((value) => (
                  <Menu.Item key={value}>
                    {({ active }) => (
                      <button onClick={() => { setFilterStatus(value); setPage(1); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm capitalize ${active ? 'bg-white/10 text-white' : 'text-white/70'}`}>
                        {filterStatus === value ? <Check size={14} className="text-[#ffd555]" /> : <span className="w-3.5" />}
                        {value === 'all' ? 'All Status' : value}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

          <Menu as="div" className="relative z-30 inline-block text-left">
            <Menu.Button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.03] hover:text-white">
              <Clock size={14} className="text-white/40" />
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
              <ChevronDown size={14} className="text-white/40" />
            </Menu.Button>
            <Transition as={Fragment} enter="transition ease-out duration-150" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Menu.Items className="absolute left-0 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#111] p-1.5 shadow-2xl focus:outline-none">
                {[['newest', 'Newest First'], ['oldest', 'Oldest First']].map(([value, label]) => (
                  <Menu.Item key={value}>
                    {({ active }) => (
                      <button onClick={() => { setSortOrder(value); setPage(1); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/10 text-white' : 'text-white/70'}`}>
                        {sortOrder === value ? <Check size={14} className="text-[#ffd555]" /> : <span className="w-3.5" />}
                        {label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>

          <div className="ml-auto text-sm font-medium tracking-wide text-white/40">{filtered.length} of {users.length} customers</div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#ffd555]/20 bg-[#14120c]">
                {['Account', 'Email', 'Phone', 'Vehicle', 'Status', 'Joined', 'Actions'].map((label) => (
                  <th key={label} className={`px-4 py-4 ${label === 'Actions' ? 'text-center' : 'text-left'}`}>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#ffd555]/70">{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)}
              {!loading && pageUsers.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-white/30">
                      <UserX size={36} />
                      <span className="text-sm">No customers match your filters</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pageUsers.map((user) => (
                <tr key={user._id} onClick={() => loadCustomerDetail(user)} className={`group cursor-pointer border-b border-white/[0.04] transition hover:-translate-y-[1px] hover:bg-white/[0.03] ${panelUser?._id === user._id ? 'bg-[#ffd555]/[0.045]' : 'even:bg-white/[0.01]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {user.profile?.avatar
                          ? <img src={user.profile.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />
                          : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd555] to-amber-500 text-sm font-bold text-black shadow-lg">{initials(user)}</div>
                        }
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#080808] ${isActive(user) ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white">{fullName(user)}</p>
                        <p className="truncate text-[11px] text-white/40">@{user.username || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[13px] text-white/55">{user.email || '-'}</td>
                  <td className="px-4 py-3 text-[13px] text-white/55">{user.profile?.phone || '-'}</td>
                  <td className="px-4 py-3 text-[13px] text-white/55">{user.vehicle?.licensePlate || user.vehicles?.[0]?.licensePlate || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-[12px] text-white/35">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(user)} title="Edit customer" className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd555]/20 bg-[#ffd555]/[0.03] text-[#ffd555]/80 transition hover:bg-[#ffd555]/10 hover:text-[#ffd555]">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => loadCustomerDetail(user)} title="View detail" className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.03] text-cyan-300/80 transition hover:bg-cyan-400/10 hover:text-cyan-200">
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-white/[0.05] bg-[#080808] px-8 py-4">
          <span className="text-xs text-white/30">Page {page} of {totalPages} - {filtered.length} results</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-25">Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => index + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${p === page ? 'bg-[#ffd555] text-black shadow-[0_0_12px_rgba(255,213,85,0.4)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>{p}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-25">Next</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {panelUser && (
          <>
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-white/[0.07] bg-[#1B2027] shadow-2xl sm:w-[460px]">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">{isEditing ? 'Edit Customer' : 'Customer Detail'}</h3>
                  <p className="mt-1 text-xs text-white/35">VALO Parking profile</p>
                </div>
                <button onClick={closePanel} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {panelUser.profile?.avatar
                          ? <img src={panelUser.profile.avatar} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-[#1B2027]" />
                          : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd555] to-amber-500 text-3xl font-bold text-black ring-4 ring-[#1B2027]">{initials(panelUser)}</div>
                        }
                        <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#1B2027] ${isActive(panelUser) ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-xl font-bold text-white">{fullName(panelUser)}</h2>
                        <p className="mt-1 truncate text-sm text-white/45">@{panelUser.username || '-'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <RoleBadge role="customer" />
                          <StatusBadge status={panelUser.status} />
                          <VerifyBadge verified={panelUser.isEmailVerified ?? panelUser.emailVerified} />
                        </div>
                      </div>
                      {detailLoading && <RefreshCw size={18} className="animate-spin text-[#ffd555]" />}
                    </div>
                  </div>

                  {!isEditing ? (
                    <>
                      <Section title="Profile" icon={User}>
                        <InfoGrid items={[
                          { label: 'Full name', value: fullName(panelUser) },
                          { label: 'Username', value: panelUser.username },
                          { label: 'Email', value: panelUser.email },
                          { label: 'Phone', value: panelUser.profile?.phone || 'Not provided' },
                          { label: 'Role', value: 'Customer' },
                          { label: 'Status', value: isActive(panelUser) ? 'Active' : 'Blocked' },
                          { label: 'Email verified', value: (panelUser.isEmailVerified ?? panelUser.emailVerified) ? 'Yes' : 'No' },
                          { label: 'Join date', value: formatDate(panelUser.createdAt, true) },
                          { label: 'Last login', value: formatDate(panelUser.lastLoginAt || panelUser.lastLogin, true) },
                          { label: 'Last updated', value: formatDate(panelUser.updatedAt, true) },
                        ]} />
                      </Section>

                      <Section title="Vehicle Information" icon={Car}>
                        {vehicle ? (
                          <InfoGrid items={[
                            { label: 'License plate', value: vehicle.licensePlate },
                            { label: 'Vehicle type', value: vehicle.vehicleType },
                            { label: 'Brand', value: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') },
                            { label: 'Color', value: vehicle.color },
                          ]} />
                        ) : <EmptyState>No vehicle registered</EmptyState>}
                      </Section>

                      <Section title="Recent Activity" icon={History}>
                        <div className="relative space-y-4 border-l border-white/10 pl-4">
                          {[
                            ['Account created', panelUser.activity?.accountCreated || panelUser.createdAt],
                            ['Profile updated', panelUser.activity?.profileUpdated || panelUser.updatedAt],
                          ].map(([label, date]) => (
                            <div key={label} className="relative">
                              <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-[#171B20] bg-[#ffd555]" />
                              <p className="text-sm font-medium text-white">{label}</p>
                              <p className="text-xs text-white/40">{formatDate(date, true)}</p>
                            </div>
                          ))}
                        </div>
                      </Section>
                    </>
                  ) : (
                    <Section title="Edit Customer" icon={Edit3}>
                      <div className="grid grid-cols-1 gap-4">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Full name</span>
                          <input value={editForm.fullName || ''} onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))} className="w-full rounded-xl border border-white/[0.07] bg-[#11161c] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ffd555]/50" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Email</span>
                          <input value={editForm.email || ''} readOnly className="w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-white/45 outline-none" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Phone</span>
                          <input value={editForm.phone || ''} onChange={(event) => setEditForm((form) => ({ ...form, phone: event.target.value }))} className="w-full rounded-xl border border-white/[0.07] bg-[#11161c] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ffd555]/50" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Status</span>
                          <select value={editForm.status || 'active'} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))} className="w-full rounded-xl border border-white/[0.07] bg-[#11161c] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ffd555]/50">
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Email verified</span>
                          <input value={editForm.emailVerified ? 'Yes' : 'No'} readOnly className="w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-white/45 outline-none" />
                        </label>
                        {vehicle && (
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">License plate</span>
                            <input value={editForm.licensePlate || ''} onChange={(event) => setEditForm((form) => ({ ...form, licensePlate: event.target.value.toUpperCase() }))} className="w-full rounded-xl border border-white/[0.07] bg-[#11161c] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ffd555]/50" />
                          </label>
                        )}
                        {panelUser.profile?.address && (
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Address</span>
                            <input value={editForm.address || ''} readOnly className="w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-white/45 outline-none" />
                          </label>
                        )}
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Role</span>
                          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-white/55">
                            <span className="flex items-center gap-2"><Shield size={14} className="text-[#ffd555]/70" />Customer</span>
                            <Lock size={14} className="text-white/25" />
                          </div>
                        </label>
                      </div>
                    </Section>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#171B20]/80 p-4 backdrop-blur-md">
                {saveState === 'success' && <p className="mb-3 rounded-lg bg-emerald-400/10 py-1.5 text-center text-sm font-medium text-emerald-300">Changes saved successfully</p>}
                {saveState === 'error' && <p className="mb-3 rounded-lg bg-rose-500/10 py-1.5 text-center text-sm font-medium text-rose-300">Failed to save changes</p>}

                {blockConfirm ? (
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
                        <p className="text-xs leading-relaxed text-rose-100/80">Blocking <strong className="text-white">{fullName(panelUser)}</strong> will prevent account access. Please enter a clear reason before confirming.</p>
                      </div>
                      <textarea value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Reason for blocking this customer..." className="mt-3 min-h-[76px] w-full resize-none rounded-xl border border-rose-400/20 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-rose-300/50" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setBlockConfirm(false); setBlockReason(''); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">Cancel</button>
                      <button onClick={handleBlockConfirm} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(244,63,94,0.28)] transition hover:bg-rose-600">Confirm Block</button>
                    </div>
                  </motion.div>
                ) : isEditing ? (
                  <div className="flex gap-3">
                    <button onClick={() => { setIsEditing(false); setSaveState('idle'); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">Cancel</button>
                    <button onClick={handleSave} disabled={saveState === 'saving'} className="flex-1 rounded-xl bg-gradient-to-r from-[#ffd555] to-amber-500 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,213,85,0.24)] transition hover:shadow-[0_0_26px_rgba(255,213,85,0.38)] disabled:opacity-60">
                      {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(panelUser)} className="flex-1 rounded-xl border border-[#ffd555]/30 py-2.5 text-sm font-medium text-[#ffd555] transition hover:bg-[#ffd555]/10">Edit Customer</button>
                    {isActive(panelUser)
                      ? <button onClick={() => setBlockConfirm(true)} className="flex-1 rounded-xl border border-rose-500/30 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10">Block Customer</button>
                      : <button onClick={() => updateStatus(panelUser, true)} className="flex-1 rounded-xl border border-emerald-500/30 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10">Unblock Customer</button>
                    }
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur-md ${
          toast.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            : 'border-red-500/30 bg-red-500/15 text-red-300'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
