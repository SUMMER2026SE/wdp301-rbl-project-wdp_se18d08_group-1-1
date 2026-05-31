import React from 'react';
import {
  Users, ShieldCheck, ParkingCircle, Ticket, Wrench,
  BarChart2, TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  UserX, UserCheck, Settings2,
} from 'lucide-react';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors group">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <TrendingUp size={13} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-green-400 mt-1 font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Quick Action Button ────────────────────────────────────────────────────────
const QuickAction = ({ icon, label, desc, color }) => (
  <button className={`w-full flex items-center gap-3 p-4 rounded-xl border ${color} hover:brightness-110 transition-all text-left group`}>
    <div className="shrink-0">{icon}</div>
    <div>
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </div>
  </button>
);

// ─── Recent action row ─────────────────────────────────────────────────────────
const ActionRow = ({ action, target, time, type }) => (
  <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
      type === 'create' ? 'bg-green-500/10' :
      type === 'delete' ? 'bg-red-500/10'   :
      type === 'block'  ? 'bg-yellow-500/10': 'bg-blue-500/10'
    }`}>
      {type === 'create' ? <CheckCircle2 size={13} className="text-green-400" /> :
       type === 'delete' ? <AlertTriangle size={13} className="text-red-400" />  :
       type === 'block'  ? <UserX size={13} className="text-yellow-400" />        :
                           <UserCheck size={13} className="text-blue-400" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-300 truncate">{action}</p>
      <p className="text-[10px] text-gray-600">{target}</p>
    </div>
    <span className="text-[10px] text-gray-600 shrink-0">{time}</span>
  </div>
);

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8 min-h-full">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Admin Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Manage the entire VALO Smart Parking system</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={18} className="text-yellow-400" />}
          color="bg-yellow-500/10"
          label="Total Staff"
          value="8"
          sub="↑ 1 added this week"
        />
        <StatCard
          icon={<ShieldCheck size={18} className="text-blue-400" />}
          color="bg-blue-500/10"
          label="Active Users"
          value="2,841"
          sub="12 blocked accounts"
        />
        <StatCard
          icon={<ParkingCircle size={18} className="text-purple-400" />}
          color="bg-purple-500/10"
          label="Parking Lots"
          value="12"
          sub="3 pending setup"
        />
        <StatCard
          icon={<DollarSign size={18} className="text-green-400" />}
          color="bg-green-500/10"
          label="Total Revenue (Month)"
          value="284M₫"
          sub="↑ 18% vs last month"
        />
      </div>

      {/* ── Mid row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Quick Actions</h3>
          <div className="space-y-2.5">
            <QuickAction
              icon={<Users size={16} className="text-yellow-400" />}
              label="Create Staff Account"
              desc="Add a new parking lot staff"
              color="bg-yellow-500/5 border-yellow-500/10"
            />
            <QuickAction
              icon={<UserX size={16} className="text-red-400" />}
              label="Block User Account"
              desc="Suspend a customer account"
              color="bg-red-500/5 border-red-500/10"
            />
            <QuickAction
              icon={<ParkingCircle size={16} className="text-purple-400" />}
              label="Create Parking Lot"
              desc="Setup a new parking facility"
              color="bg-purple-500/5 border-purple-500/10"
            />
            <QuickAction
              icon={<Ticket size={16} className="text-sky-400" />}
              label="Create Ticket Package"
              desc="Add monthly or hourly ticket"
              color="bg-sky-500/5 border-sky-500/10"
            />
            <QuickAction
              icon={<Settings2 size={16} className="text-orange-400" />}
              label="Configure Overtime Rates"
              desc="Set penalty pricing rules"
              color="bg-orange-500/5 border-orange-500/10"
            />
          </div>
        </div>

        {/* Recent admin actions */}
        <div className="lg:col-span-2 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Recent Admin Actions</h3>
            <span className="text-[10px] text-gray-600 bg-white/5 px-2.5 py-1 rounded-full">Last 24h</span>
          </div>
          <ActionRow action="Created Staff Account" target="Nguyen Thi Lan • staff@lot-b.vn" time="5m ago"  type="create" />
          <ActionRow action="Blocked User Account"    target="ID #4421 • khach01@gmail.com"       time="22m ago" type="block"  />
          <ActionRow action="Deleted Ticket Package"  target="Monthly Basic – expired plan"        time="1h ago"  type="delete" />
          <ActionRow action="Updated Staff Privileges" target="Tran Van Minh • Lot C staff"   time="2h ago"  type="update" />
          <ActionRow action="Unblocked User Account"  target="ID #3302 • appeal approved"          time="3h ago"  type="update" />
          <ActionRow action="Created Parking Lot"     target="Lot D – District 7, 200 slots"       time="5h ago"  type="create" />
        </div>
      </div>

      {/* ── Revenue + Services summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue overview */}
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Revenue Analytics (This Week)</h3>
          <div className="space-y-3">
            {[
              { label: 'Lot A – District 1',  value: '84.2M₫', pct: 82, color: 'bg-yellow-500' },
              { label: 'Lot B – District 3',  value: '61.0M₫', pct: 60, color: 'bg-yellow-400' },
              { label: 'Lot C – District 7',  value: '45.8M₫', pct: 45, color: 'bg-yellow-300' },
              { label: 'Lot D – Binh Thanh',  value: '22.1M₫', pct: 22, color: 'bg-yellow-200' },
            ].map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="text-white font-bold">{r.value}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services status */}
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Services Overview</h3>
          <div className="space-y-2.5">
            {[
              { name: 'ALPR AI Check-in',     status: 'Active',      cls: 'bg-green-900/40 text-green-400'  },
              { name: 'QR Dynamic Backup',    status: 'Active',      cls: 'bg-green-900/40 text-green-400'  },
              { name: 'VALO Wallet Payment',  status: 'Active',      cls: 'bg-green-900/40 text-green-400'  },
              { name: 'VNPay Integration',    status: 'Maintenance', cls: 'bg-yellow-900/40 text-yellow-400'},
              { name: 'Email Notification',   status: 'Active',      cls: 'bg-green-900/40 text-green-400'  },
              { name: 'SMS Gateway',          status: 'Inactive',    cls: 'bg-red-900/40 text-red-400'      },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <Wrench size={13} className="text-gray-600" />
                  <span className="text-sm text-gray-300">{s.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${s.cls}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
