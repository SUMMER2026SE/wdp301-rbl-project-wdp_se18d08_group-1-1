import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  MonitorCheck, Car, FileWarning, ClipboardList,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, DoorOpen,
  XCircle, ArrowRightCircle, QrCode,
} from 'lucide-react';
import { getAllFloors } from '../../services/parkingFloorService';
import { getAllBookings } from '../../services/bookingService';
import toast, { Toaster } from 'react-hot-toast';

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
const SlotCell = ({ id, name, status, plate }) => {
  const cfg = {
    OCCUPIED: { bg: 'bg-gray-800 border-gray-700',        text: 'text-gray-400', badge: 'text-gray-500 bg-gray-700/50' },
    EMPTY:    { bg: 'bg-emerald-900/30 border-emerald-700/40', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-900/50' },
    RESERVED: { bg: 'bg-yellow-900/20 border-yellow-700/30',   text: 'text-yellow-400', badge: 'text-yellow-400 bg-yellow-900/40'   },
  }[status] || {};

  const hasName = name && name.trim().length > 0;
  const displayName = hasName ? name : 'Unnamed Slot';

  return (
    <div className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 ${cfg.bg} ${!hasName ? 'opacity-60 border-dashed bg-transparent' : ''} text-center h-[90px] w-full overflow-hidden`}>
      <span className={`text-xs font-extrabold ${cfg.text} truncate w-full`} title={hasName ? name : id}>
        {displayName}
      </span>
      
      {!hasName ? (
        <span className="text-[8px] text-gray-500 font-mono truncate w-full px-1" title={id}>
          #{id.split('-').pop()}
        </span>
      ) : (
        plate && <span className="text-[9px] text-gray-500 font-mono">{plate}</span>
      )}
      
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.badge} mt-auto`}>
        {status}
      </span>
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
        status === 'ACTIVE'    ? 'bg-green-900/50 text-green-400'  :
        status === 'COMPLETED' ? 'bg-blue-900/50 text-blue-400'    :
        status === 'PENDING'   ? 'bg-yellow-900/50 text-yellow-400':
                                 'bg-red-900/50 text-red-400'
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
  const [floors, setFloors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [floorsRes, bookingsRes] = await Promise.all([
        getAllFloors(),
        getAllBookings({ date: format(new Date(), 'yyyy-MM-dd') })
      ]);
      
      if (floorsRes.data?.success) setFloors(floorsRes.data.data || floorsRes.data.floors || []);
      if (bookingsRes.data?.success) setBookings(bookingsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to sync dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const { totalSlots, activeFloor, activeFloorSlots, activeBookings, recentBookings } = useMemo(() => {
    let tSlots = 0;
    floors.forEach(f => {
      const elements = f.layoutData?.elements || [];
      tSlots += elements.filter(e => e.type?.startsWith('slot')).length;
    });

    const activeB = bookings.filter(b => b.status === 'ACTIVE');
    
    // Sort bookings descending by creation time (or start time)
    const sorted = [...bookings].sort((a, b) => new Date(b.createdAt || b.scheduledStart) - new Date(a.createdAt || a.scheduledStart)).reverse();
    const recent = sorted.slice(0, 4);

    const aFloor = floors.length > 0 ? floors[0] : null;
    let aFloorSlots = [];
    if (aFloor) {
      const elements = aFloor.layoutData?.elements || [];
      aFloorSlots = elements.filter(e => e.type?.startsWith('slot'))
                            .map(e => ({ id: e.id, name: e.name || '' }))
                            .sort((a, b) => {
                              const nameA = a.name || a.id;
                              const nameB = b.name || b.id;
                              return nameA.localeCompare(nameB, undefined, { numeric: true });
                            });
    }

    return { totalSlots: tSlots, activeFloor: aFloor, activeFloorSlots: aFloorSlots, activeBookings: activeB, recentBookings: recent };
  }, [floors, bookings]);

  const getSlotData = (slotLabel) => {
    if (!activeFloor) return { status: 'EMPTY' };
    const booking = bookings.find(b => 
      b.parkingSlot === slotLabel && 
      (b.floorId?._id === activeFloor._id || b.floorId === activeFloor._id) &&
      ['ACTIVE', 'PENDING'].includes(b.status)
    );
    if (booking) {
      if (booking.status === 'ACTIVE') return { status: 'OCCUPIED', plate: booking.licensePlate };
      if (booking.status === 'PENDING') return { status: 'RESERVED', plate: booking.licensePlate };
    }
    return { status: 'EMPTY' };
  };

  if (loading && floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        Loading Staff Dashboard...
      </div>
    );
  }

  const occupancyRate = totalSlots > 0 ? Math.round((activeBookings.length / totalSlots) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 min-h-full">
      <Toaster position="top-right" />
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
          value={totalSlots}
          sub={`${floors.length} lots assigned`}
        />
        <StatCard
          icon={<Car size={18} className="text-sky-400" />}
          color="bg-sky-500/10"
          label="Vehicles Inside Now"
          value={activeBookings.length}
          sub={`${occupancyRate}% occupancy`}
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
          value="0"
          sub="0 pending review"
        />
      </div>

      {/* ── Mid row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Grid */}
        <div className="lg:col-span-2 bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-sm">Live Grid — {activeFloor ? activeFloor.name : 'Loading...'}</h3>
              <p className="text-gray-600 text-[10px] mt-0.5">Real-time slot status</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-gray-500">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {activeFloorSlots.length === 0 ? (
              <p className="text-white/40 text-sm col-span-full">No slots found on this floor.</p>
            ) : (
              activeFloorSlots.map(slotObj => {
                const slotLabel = slotObj.name || slotObj.id;
                const data = getSlotData(slotLabel);
                return (
                  <SlotCell 
                    key={slotObj.id} 
                    id={slotObj.id} 
                    name={slotObj.name}
                    status={data.status} 
                    plate={data.plate} 
                  />
                );
              })
            )}
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
          <div className="space-y-1">
            {recentBookings.length === 0 ? (
              <p className="text-white/40 text-xs py-4">No recent bookings today.</p>
            ) : (
              recentBookings.map(b => (
                <BookingRow 
                  key={b._id} 
                  id={`#B-${b._id.slice(-4).toUpperCase()}`} 
                  plate={b.licensePlate} 
                  slot={b.parkingSlot} 
                  time={format(new Date(b.createdAt || b.scheduledStart), 'HH:mm')} 
                  status={b.status} 
                />
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-[#16181F] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Lot Alerts & Violations</h3>
          <div className="space-y-2.5">
            {occupancyRate > 90 && (
              <AlertPill
                icon={<AlertTriangle size={14} className="text-yellow-400" />}
                text={`Lot ${activeFloor?.name || 'A'} near capacity (${occupancyRate}%) — consider diverting traffic`}
                time="Just now" level="warn"
              />
            )}
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
