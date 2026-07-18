import { useState, useEffect, useMemo } from 'react';
import { format, differenceInMinutes, startOfDay, isToday } from 'date-fns';
import {
  MonitorCheck, Car, FileWarning, ClipboardList,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, DoorOpen,
  XCircle, ArrowRightCircle, QrCode, Activity, PlayCircle, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllFloors, getFloorSlots } from '../../services/parkingFloorService';
import { getAllBookings } from '../../services/bookingService';
import { API_BASE } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, borderGlow }) => (
  <div className={`relative overflow-hidden bg-[#16181F]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-${borderGlow}/30 transition-all duration-300 group shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
    {/* Subtle gradient background glow */}
    <div className={`absolute -inset-20 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-3xl ${color}`} />
    
    <div className="flex items-center justify-between relative z-10">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg shadow-black/50 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="bg-white/5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <TrendingUp size={14} className="text-emerald-400" />
      </div>
    </div>
    <div className="relative z-10 mt-2">
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[11px] text-emerald-400/90 mt-1.5 font-semibold flex items-center gap-1"><Activity size={10}/> {sub}</p>}
    </div>
  </div>
);

// ─── Slot status grid cell ─────────────────────────────────────────────────────
const SlotCell = ({ id, name, status, plate, isVip, onClick }) => {
  const cfg = {
    OCCUPIED: { 
      bg: 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700/50', 
      text: 'text-gray-300', 
      badge: 'text-gray-400 bg-gray-800/80 border border-gray-600/50',
      glow: ''
    },
    EMPTY:    { 
      bg: 'bg-gradient-to-b from-emerald-900/40 to-[#0b111c] border-emerald-700/40', 
      text: 'text-emerald-400', 
      badge: 'text-emerald-300 bg-emerald-900/60 border border-emerald-500/30',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]'
    },
    MAINTENANCE: {
      bg: 'bg-gradient-to-b from-red-900/30 to-[#0b111c] border-red-700/40',
      text: 'text-red-400',
      badge: 'text-red-300 bg-red-900/60 border border-red-500/30',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]'
    },
    RESERVED: { 
      bg: 'bg-gradient-to-b from-yellow-900/30 to-[#0b111c] border-yellow-700/40', 
      text: 'text-yellow-400', 
      badge: 'text-yellow-300 bg-yellow-900/60 border border-yellow-500/30',
      glow: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]'
    },
  }[status] || {};

  const hasName = name && name.trim().length > 0;
  const displayName = hasName ? name : 'Unnamed Slot';

  return (
    <div onClick={onClick} className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 ${cfg.bg} ${cfg.glow} ${!hasName ? 'opacity-50 border-dashed bg-transparent shadow-none' : 'hover:-translate-y-1 hover:brightness-125 transition-all duration-300 cursor-pointer'} text-center h-[95px] w-full overflow-hidden relative group`}>
      {isVip && (
        <div className="absolute top-1.5 right-1.5 text-yellow-400 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
          <Crown size={12} strokeWidth={3} />
        </div>
      )}
      <span className={`text-xs font-black ${cfg.text} truncate w-full tracking-wide`} title={hasName ? name : id}>
        {displayName}
      </span>
      
      {!hasName ? (
        <span className="text-[9px] text-gray-500 font-mono truncate w-full px-1" title={id}>
          #{id.split('-').pop()}
        </span>
      ) : (
        plate && <span className="text-[10px] text-gray-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5">{plate}</span>
      )}
      
      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${cfg.badge} mt-auto shadow-sm`}>
        {status}
      </span>
    </div>
  );
};

// ─── Booking row ───────────────────────────────────────────────────────────────
const BookingRow = ({ id, plate, slot, time, status }) => (
  <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors cursor-pointer group">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
      <Car size={15} className="text-gray-400 group-hover:text-white transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-gray-200 font-mono tracking-wide">{plate}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Booking {id} <span className="text-gray-700">•</span> Slot {slot}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[11px] text-gray-400 font-medium mb-1">{time}</p>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
        status === 'ACTIVE'    ? 'bg-green-900/30 text-green-400 border-green-500/30'  :
        status === 'COMPLETED' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30'    :
        status === 'PENDING'   ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30':
                                 'bg-red-900/30 text-red-400 border-red-500/30'
      }`}>{status}</span>
    </div>
  </div>
);

// ─── Alert pill ────────────────────────────────────────────────────────────────
const AlertPill = ({ icon, text, time, level }) => (
  <div className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:brightness-110 ${
    level === 'warn'  ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)]' :
    level === 'error' ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]'       :
                        'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
  }`}>
    <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${
      level === 'warn' ? 'bg-yellow-500/20' : level === 'error' ? 'bg-red-500/20' : 'bg-emerald-500/20'
    }`}>{icon}</div>
    <div>
      <p className="text-[13px] text-gray-200 font-medium leading-snug">{text}</p>
      <p className="text-[10px] text-gray-500 mt-1 font-medium">{time}</p>
    </div>
  </div>
);

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [floors, setFloors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dbSlots, setDbSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch floors and bookings
      const [floorsRes, bookingsRes] = await Promise.all([
        getAllFloors(),
        getAllBookings() // Fetch all bookings to calculate today's cancelled/violations
      ]);
      
      // Fetch sessions separately using API_BASE
      const sessionsRes = await fetch(`${API_BASE}/sessions`);
      const sessionsData = await sessionsRes.json();

      const fetchedFloors = floorsRes.data?.success ? (floorsRes.data.data || floorsRes.data.floors || []) : [];
      setFloors(fetchedFloors);
      
      if (fetchedFloors.length > 0) {
        const promises = fetchedFloors.map(f => getFloorSlots(f._id));
        const results = await Promise.all(promises);
        const allSlots = results.flatMap(r => (r.ok && r.data.success) ? r.data.data : []);
        setDbSlots(allSlots);
      } else {
        setDbSlots([]);
      }

      if (bookingsRes.data?.success) setBookings(bookingsRes.data.data || []);
      if (sessionsData.success) setSessions(sessionsData.data || []);

    } catch (error) {
      toast.error('Failed to sync dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const { totalSlots, activeFloor, activeFloorSlots, vehiclesInside, avgDwellTimeStr, violationsCount, recentBookings, occupancyRate } = useMemo(() => {
    let tSlots = 0;
    floors.forEach(f => {
      const elements = f.layoutData?.elements || [];
      tSlots += elements.filter(e => e.type?.startsWith('slot')).length;
    });

    // 1. Vehicles Inside Now (Active Sessions)
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'ACTIVE');
    const vInside = activeSessions.length;

    // 2. Avg Dwell Time (from completed sessions today)
    const todaySessions = sessions.filter(s => 
      (s.status === 'completed' || s.status === 'COMPLETED') && 
      s.checkOutTime && 
      isToday(new Date(s.checkOutTime))
    );

    let avgDwellStr = "0h 0m";
    if (todaySessions.length > 0) {
      let totalMinutes = 0;
      todaySessions.forEach(s => {
        totalMinutes += Math.abs(differenceInMinutes(new Date(s.checkOutTime), new Date(s.checkInTime)));
      });
      const avgMinutes = Math.round(totalMinutes / todaySessions.length);
      const h = Math.floor(avgMinutes / 60);
      const m = avgMinutes % 60;
      avgDwellStr = `${h}h ${m}m`;
    }

    // 3. Violations Today (Cancelled Bookings today)
    const cancelledToday = bookings.filter(b => 
      b.status === 'CANCELLED' && 
      isToday(new Date(b.updatedAt || b.createdAt))
    );
    const vCount = cancelledToday.length;

    // Sort bookings descending by creation time (or start time)
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt || b.scheduledStart) - new Date(a.createdAt || a.scheduledStart)).reverse();
    const recent = sortedBookings.slice(0, 5);

    const aFloor = floors.length > 0 ? floors[0] : null;
    let aFloorSlots = [];
    if (aFloor) {
      const elements = aFloor.layoutData?.elements || [];
      aFloorSlots = elements.filter(e => e.type?.startsWith('slot'))
                            .map(e => ({ id: e.id, name: e.name || '', type: e.type }))
                            .sort((a, b) => {
                              const nameA = a.name || a.id;
                              const nameB = b.name || b.id;
                              return nameA.localeCompare(nameB, undefined, { numeric: true });
                            });
    }

    const occRate = tSlots > 0 ? Math.round((vInside / tSlots) * 100) : 0;

    return { 
      totalSlots: tSlots, 
      activeFloor: aFloor, 
      activeFloorSlots: aFloorSlots, 
      vehiclesInside: vInside, 
      avgDwellTimeStr: avgDwellStr,
      violationsCount: vCount,
      recentBookings: recent,
      occupancyRate: occRate
    };
  }, [floors, bookings, sessions]);

  const getSlotData = (slotObj) => {
    const slotLabel = slotObj.name || slotObj.id;
    if (!activeFloor) return { status: 'EMPTY', isVip: false };
    
    // Check if slot is under maintenance
    const dbSlotInfo = dbSlots.find(s => s.slotNumber === slotLabel && s.floorID === activeFloor._id);
    
    // Determine VIP status from DB (subscription) or layout type
    const isLayoutVip = slotObj.type === 'slot_vip' || slotObj.type?.includes('vip');
    const isDbVip = dbSlotInfo && ['monthly', 'yearly'].includes(dbSlotInfo.subscriptionType);
    const isVip = isLayoutVip || isDbVip;

    if (dbSlotInfo && dbSlotInfo.status === 'maintenance') {
      return { status: 'MAINTENANCE', plate: null, isVip };
    }

    // Check sessions first (actual physical occupancy)
    const activeSession = sessions.find(s => 
      (s.status === 'active' || s.status === 'ACTIVE') && 
      s.parkingSlot === slotLabel &&
      (!s.floorId || s.floorId?._id === activeFloor._id || s.floorId === activeFloor._id)
    );

    if (activeSession) {
      return { status: 'OCCUPIED', plate: activeSession.licensePlate, isVip };
    }

    const booking = bookings.find(b => 
      b.parkingSlot === slotLabel && 
      (b.floorId?._id === activeFloor._id || b.floorId === activeFloor._id) &&
      ['ACTIVE', 'PENDING'].includes(b.status)
    );
    
    if (booking) {
      if (booking.status === 'ACTIVE') return { status: 'OCCUPIED', plate: booking.licensePlate, isVip };
      if (booking.status === 'PENDING') return { status: 'RESERVED', plate: booking.licensePlate, isVip };
    }
    
    return { status: 'EMPTY', isVip };
  };

  if (loading && floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm font-medium animate-pulse tracking-wide">Syncing System Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 min-h-full bg-[#0b111c] text-white selection:bg-emerald-500/30">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#16181F', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
      
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">System Overview</h1>
          <p className="text-emerald-400/80 text-sm mt-1.5 font-medium flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Real-time data synced
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400 font-medium">{format(new Date(), 'EEEE, MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={<MonitorCheck size={20} className="text-yellow-100" />}
          color="from-yellow-600/80 to-yellow-500/20"
          borderGlow="yellow-500"
          label="Managed Slots"
          value={totalSlots}
          sub={`${floors.length} active floors`}
        />
        <StatCard
          icon={<Car size={20} className="text-sky-100" />}
          color="from-sky-600/80 to-sky-500/20"
          borderGlow="sky-500"
          label="Vehicles Inside"
          value={vehiclesInside}
          sub={`${occupancyRate}% occupancy`}
        />
        <StatCard
          icon={<Clock size={20} className="text-violet-100" />}
          color="from-violet-600/80 to-violet-500/20"
          borderGlow="violet-500"
          label="Avg. Dwell Time"
          value={avgDwellTimeStr}
          sub="Today's completed"
        />
        <StatCard
          icon={<FileWarning size={20} className="text-orange-100" />}
          color="from-orange-600/80 to-orange-500/20"
          borderGlow="orange-500"
          label="Cancellations"
          value={violationsCount}
          sub="Requires attention"
        />
      </div>

      {/* ── Mid row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Grid */}
        <div className="lg:col-span-2 bg-[#16181F]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
            <div>
              <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                Live Grid <span className="text-gray-500 font-normal">—</span> <span className="text-emerald-400">{activeFloor ? activeFloor.name : 'Loading...'}</span>
              </h3>
              <p className="text-gray-400 text-xs mt-1 font-medium tracking-wide uppercase">Real-time slot telemetry</p>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[450px] overflow-y-auto custom-scrollbar pr-2 relative z-10 pb-4">
            {activeFloorSlots.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <MonitorCheck size={48} className="text-gray-600 mb-4" />
                <p className="text-white font-medium">No slot layout found on this floor.</p>
              </div>
            ) : (
              activeFloorSlots.map(slotObj => {
                const data = getSlotData(slotObj);
                return (
                  <SlotCell 
                    key={slotObj.id} 
                    id={slotObj.id} 
                    name={slotObj.name}
                    status={data.status} 
                    plate={data.plate} 
                    isVip={data.isVip}
                    onClick={() => navigate('/staff/live-grid')}
                  />
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-2 pt-4 border-t border-white/10 relative z-10">
            {[
              { color: 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]', label: 'Occupied' },
              { color: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]', label: 'Empty' },
              { color: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]', label: 'Reserved' },
              { color: 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]', label: 'Maintenance' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs font-bold text-gray-400 tracking-wide uppercase">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gate Control Panel */}
        <div className="bg-[#16181F]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <h3 className="text-white font-extrabold text-lg relative z-10">Gate & Actions</h3>

          {/* Open Gate Manually */}
          <div className={`mt-2 rounded-2xl border p-5 flex flex-col items-center gap-4 transition-all duration-500 relative z-10 overflow-hidden ${
            gateOpen ? 'bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-black/40 border-white/10'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 transition-opacity duration-500 ${gateOpen ? 'opacity-100' : ''}`} />
            
            <DoorOpen size={36} className={`transition-all duration-500 relative z-10 ${gateOpen ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-gray-500'}`} />
            <p className="text-xs text-gray-400 text-center font-bold tracking-widest uppercase relative z-10">Gate A-01</p>
            
            <button
              onClick={() => setGateOpen((o) => !o)}
              className={`w-full py-3 rounded-xl text-sm font-black tracking-wide transition-all duration-300 relative z-10 shadow-lg ${
                gateOpen
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {gateOpen ? <><PlayCircle size={16}/> GATE OPEN</> : 'OPEN GATE MANUALLY'}
              </div>
            </button>
            
            {gateOpen && (
              <p className="text-[10px] text-emerald-400 text-center animate-pulse font-bold tracking-widest uppercase relative z-10">
                Auto-closing in 30s...
              </p>
            )}
          </div>

          <div className="space-y-3 mt-2 relative z-10">
            {/* Process Vehicle Exit */}
            <button className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/40 hover:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all duration-300 text-left group">
              <div className="p-2 rounded-xl bg-sky-500/20 group-hover:scale-110 transition-transform">
                <ArrowRightCircle size={18} className="text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-sky-100 tracking-wide">Process Exit</p>
                <p className="text-[11px] text-sky-400/60 font-medium mt-0.5">Confirm payment & exit</p>
              </div>
            </button>

            {/* Scan QR Check-out */}
            <button className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.15)] transition-all duration-300 text-left group">
              <div className="p-2 rounded-xl bg-yellow-500/20 group-hover:scale-110 transition-transform">
                <QrCode size={18} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-100 tracking-wide">Scan QR Code</p>
                <p className="text-[11px] text-yellow-400/60 font-medium mt-0.5">Manual fallback checkout</p>
              </div>
            </button>

            {/* Update Slot Status */}
            <button className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-left group">
              <div className="p-2 rounded-xl bg-white/10 group-hover:scale-110 transition-transform">
                <ClipboardList size={18} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200 tracking-wide">Update Slot</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">Mark maintenance issues</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">

        {/* Recent Bookings */}
        <div className="bg-[#16181F]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-5 relative z-10">
            <h3 className="text-white font-extrabold text-lg">Activity Stream</h3>
            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors uppercase tracking-wider">
              View All
            </span>
          </div>
          <div className="space-y-2 relative z-10 bg-black/20 p-2 rounded-2xl border border-white/5">
            {recentBookings.length === 0 ? (
              <div className="py-8 flex flex-col items-center opacity-50">
                <Activity size={32} className="text-gray-500 mb-2" />
                <p className="text-white font-medium">No activities today.</p>
              </div>
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
        <div className="bg-[#16181F]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <h3 className="text-white font-extrabold text-lg mb-5 relative z-10">Lot Diagnostics</h3>
          <div className="space-y-3 relative z-10">
            {occupancyRate > 90 ? (
              <AlertPill
                icon={<AlertTriangle size={16} className="text-yellow-400" />}
                text={`Lot ${activeFloor?.name || 'A'} is nearing capacity (${occupancyRate}%). Consider diverting incoming traffic.`}
                time="Active Now" level="warn"
              />
            ) : (
              <AlertPill
                icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                text={`Lot ${activeFloor?.name || 'A'} capacity is optimal (${occupancyRate}%).`}
                time="Active Now" level="ok"
              />
            )}
            
            {violationsCount > 0 && (
              <AlertPill
                icon={<FileWarning size={16} className="text-orange-400" />}
                text={`${violationsCount} booking(s) cancelled today. Please review cancellation logs.`}
                time="Today" level="warn"
              />
            )}

            <AlertPill
              icon={<CheckCircle2 size={16} className="text-emerald-400" />}
              text="Gate A-01 sensors and cameras operating normally."
              time="System verified" level="ok"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
