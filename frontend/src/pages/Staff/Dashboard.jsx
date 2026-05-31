import React, { useState } from 'react';
import {
  MonitorCheck, Car, Gauge, FileWarning, ClipboardList,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, DoorOpen,
  XCircle, ArrowRightCircle, QrCode,
} from 'lucide-react';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors group">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <TrendingUp size={13} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-emerald-400 mt-1 font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Slot status grid cell ─────────────────────────────────────────────────────
const SlotCell = ({ id, status, plate }) => {
  const cfg = {
    OCCUPIED: { bg: 'bg-gray-800 border-gray-700',        text: 'text-gray-400', badge: 'text-gray-500 bg-gray-700/50' },
    EMPTY:    { bg: 'bg-emerald-900/30 border-emerald-700/40', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-900/50' },
    RESERVED: { bg: 'bg-yellow-900/20 border-yellow-700/30',   text: 'text-yellow-400', badge: 'text-yellow-400 bg-yellow-900/40'   },
  }[status] || {};

  return (
    <div className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 ${cfg.bg}`}>
      <span className={`text-xs font-extrabold ${cfg.text}`}>{id}</span>
      {plate && <span className="text-[9px] text-gray-500 font-mono">{plate}</span>}
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{status}</span>
    </div>
  );
};

// ─── Booking row ───────────────────────────────────────────────────────────────
const BookingRow = ({ id, plate, slot, time, status }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
      <Car size={13} className="text-gray-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-gray-200 font-mono">{plate}</p>
      <p className="text-[10px] text-gray-600">Booking {id} • Slot {slot}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[10px] text-gray-500">{time}</p>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        status === 'Active'    ? 'bg-green-900/50 text-green-400'  :
        status === 'Completed' ? 'bg-blue-900/50 text-blue-400'    :
                                 'bg-yellow-900/50 text-yellow-400'
      }`}>{status}</span>
    </div>
  </div>
);

// ─── Alert pill ────────────────────────────────────────────────────────────────
const AlertPill = ({ icon, text, time, level }) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl border ${
    level === 'warn'  ? 'bg-yellow-500/8 border-yellow-500/15' :
    level === 'error' ? 'bg-red-500/8 border-red-500/15'       :
                        'bg-emerald-500/8 border-emerald-500/15'
  }`}>
    <div className="shrink-0 mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-gray-300 font-medium">{text}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{time}</p>
    </div>
  </div>
);

export default function StaffDashboard() {
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-8 min-h-full">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Staff Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor and operate your assigned parking lots</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<MonitorCheck size={18} className="text-yellow-400" />}
          color="bg-yellow-500/10"
          label="Slots Under Management"
          value="124"
          sub="3 lots assigned"
        />
        <StatCard
          icon={<Car size={18} className="text-sky-400" />}
          color="bg-sky-500/10"
          label="Vehicles Inside Now"
          value="87"
          sub="70% occupancy"
        />
        <StatCard
          icon={<Clock size={18} className="text-violet-400" />}
          color="bg-violet-500/10"
          label="Avg. Dwell Time"
          value="1h 42m"
          sub="↓ 8min vs yesterday"
        />
        <StatCard
          icon={<FileWarning size={18} className="text-orange-400" />}
          color="bg-orange-500/10"
          label="Violations Today"
          value="3"
          sub="1 pending review"
        />
      </div>

      {/* ── Mid row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Grid – Lot A */}
        <div className="lg:col-span-2 bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-sm">Live Grid — Lot A</h3>
              <p className="text-gray-600 text-[10px] mt-0.5">Real-time slot status</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-gray-500">Live</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <SlotCell id="A-01" status="OCCUPIED" plate="51G-123.45" />
            <SlotCell id="A-02" status="EMPTY"    />
            <SlotCell id="A-03" status="RESERVED" plate="43A-567.89" />
            <SlotCell id="A-04" status="OCCUPIED" plate="92C-444.22" />
            <SlotCell id="A-05" status="EMPTY"    />
            <SlotCell id="A-06" status="OCCUPIED" plate="61B-238.10" />
            <SlotCell id="A-07" status="OCCUPIED" plate="30H-999.11" />
            <SlotCell id="A-08" status="RESERVED" plate="77A-001.55" />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/5">
            {[
              { color: 'bg-gray-600',          label: 'Occupied' },
              { color: 'bg-emerald-500',        label: 'Empty'    },
              { color: 'bg-yellow-500',         label: 'Reserved' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                <span className="text-[10px] text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gate Control Panel */}
        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-white font-bold text-sm">Gate & Quick Actions</h3>

          {/* Open Gate Manually */}
          <div className={`rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all duration-300 ${
            gateOpen ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-white/3 border-white/5'
          }`}>
            <DoorOpen size={32} className={gateOpen ? 'text-emerald-400' : 'text-gray-600'} />
            <p className="text-xs text-gray-400 text-center">Gate A-01</p>
            <button
              onClick={() => setGateOpen((o) => !o)}
              className={`w-full py-2.5 rounded-xl text-sm font-extrabold transition-all ${
                gateOpen
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {gateOpen ? '🔓 Gate OPEN' : 'Open Gate Manually'}
            </button>
            {gateOpen && (
              <p className="text-[10px] text-emerald-400 text-center animate-pulse">
                Gate will auto-close in 30s
              </p>
            )}
          </div>

          {/* Process Vehicle Exit */}
          <button className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-sky-500/8 border border-sky-500/15 hover:bg-sky-500/12 transition-colors text-left group">
            <ArrowRightCircle size={16} className="text-sky-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Process Vehicle Exit</p>
              <p className="text-[10px] text-gray-600">Confirm cash / deduct wallet</p>
            </div>
          </button>

          {/* Scan QR Check-out */}
          <button className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-yellow-500/8 border border-yellow-500/15 hover:bg-yellow-500/12 transition-colors text-left group">
            <QrCode size={16} className="text-yellow-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Scan QR Check-out</p>
              <p className="text-[10px] text-gray-600">Manual checkout / Kiosk fallback</p>
            </div>
          </button>

          {/* Update Slot Status */}
          <button className="w-full flex items-center gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left group">
            <ClipboardList size={16} className="text-gray-400 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
            <div>
              <p className="text-xs font-bold text-gray-300">Update Slot Status</p>
              <p className="text-[10px] text-gray-600">Mark as maintenance / blocked</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Bookings */}
        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">Recent Bookings</h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-700/30 cursor-pointer hover:brightness-110">
              Manage all →
            </span>
          </div>
          <BookingRow id="#B-2041" plate="51G-123.45" slot="A-01" time="09:12 AM" status="Active"    />
          <BookingRow id="#B-2040" plate="43A-567.89" slot="A-03" time="08:55 AM" status="Active"    />
          <BookingRow id="#B-2038" plate="92C-444.22" slot="B-07" time="08:20 AM" status="Completed" />
          <BookingRow id="#B-2036" plate="77A-001.55" slot="A-08" time="07:45 AM" status="Pending"   />
        </div>

        {/* Alerts */}
        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Lot Alerts & Violations</h3>
          <div className="space-y-2.5">
            <AlertPill
              icon={<AlertTriangle size={14} className="text-yellow-400" />}
              text="Lot B near capacity (92%) — consider diverting traffic"
              time="5 min ago" level="warn"
            />
            <AlertPill
              icon={<XCircle size={14} className="text-red-400" />}
              text="Sensor A-07 signal lost — manual check required"
              time="20 min ago" level="error"
            />
            <AlertPill
              icon={<FileWarning size={14} className="text-orange-400" />}
              text="Parking violation reported — Slot C-03 unauthorized vehicle"
              time="35 min ago" level="warn"
            />
            <AlertPill
              icon={<CheckCircle2 size={14} className="text-emerald-400" />}
              text="Gate A-01 maintenance completed — fully operational"
              time="1h ago" level="ok"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
