import { useState, useEffect, useMemo } from 'react';
import { format, addDays, subDays, startOfDay, differenceInMinutes } from 'date-fns';
import {
  ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle,
  Search, Filter, Loader2, Car, CreditCard, Calendar, LayoutGrid,
  ArrowRight, ShieldCheck, Activity, XCircle
} from 'lucide-react';
import { getAllFloors } from '../../services/parkingFloorService';
import { getAllBookings } from '../../services/bookingService';
import toast, { Toaster } from 'react-hot-toast';

const safeFormat = (date, fmt) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'Invalid' : format(d, fmt);
};

// --- Helper Functions ---
const getBookingGroup = (status) => {
  if (['ACTIVE', 'PAUSED'].includes(status)) return 'ACTIVE';
  if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status)) return 'HISTORY';
  return 'UPCOMING';
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'ACTIVE': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' };
    case 'PAID': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' };
    case 'PENDING': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' };
    case 'COMPLETED': return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', glow: '' };
    case 'CANCELLED':
    case 'EXPIRED': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' };
    default: return { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10', glow: '' };
  }
};

const LicensePlate = ({ plate, size = 'sm' }) => (
  <div className={`inline-flex items-center justify-center border border-white/20 rounded-md bg-black/80 font-mono font-bold uppercase tracking-widest text-white shadow-inner ${size === 'sm' ? 'px-2 py-0.5 text-sm' : 'px-4 py-1.5 text-2xl'}`}>
    {plate || 'UNKNOWN'}
  </div>
);

const ProgressBar = ({ start, end }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (now < startDate) {
        setProgress(0);
      } else if (now > endDate) {
        setProgress(100);
      } else {
        const total = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        setProgress(Math.round((elapsed / total) * 100));
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [start, end]);

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-[10px] text-emerald-400/80 mb-2 font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1"><Activity size={10} className="animate-pulse" /> Duration Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full bg-[#0b0e14] rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-1000 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  );
};

export default function BookingManagement() {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [floors, setFloors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFloor, setSelectedFloor] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    document.body.classList.add("bg-[#09090b]");
    return () => document.body.classList.remove("bg-[#09090b]");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [floorsRes, bookingsRes] = await Promise.all([
          getAllFloors(),
          getAllBookings({ date: format(currentDate, 'yyyy-MM-dd') })
        ]);
        if (floorsRes.data?.success) setFloors(floorsRes.data.data || floorsRes.data.floors || []);
        if (bookingsRes.data?.success) setBookings(bookingsRes.data.data || []);
        setSelectedBooking(null);
      } catch (error) {
        toast.error(error?.message || 'Failed to load booking data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDate]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedFloor !== 'all' && (b.floorId?._id || b.floorId) !== selectedFloor) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return b.licensePlate?.toLowerCase().includes(q) ||
          b.userId?.fullName?.toLowerCase().includes(q) ||
          String(b.parkingSlot).toLowerCase().includes(q);
      }
      return true;
    });
  }, [bookings, selectedFloor, searchQuery]);

  // Group bookings
  const { upcoming, active, history } = useMemo(() => {
    const groups = { upcoming: [], active: [], history: [] };
    filteredBookings.forEach(b => {
      const group = getBookingGroup(b.status, b.scheduledStart);
      if (group === 'UPCOMING') groups.upcoming.push(b);
      else if (group === 'ACTIVE') groups.active.push(b);
      else groups.history.push(b);
    });

    // Sort logic
    groups.upcoming.sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
    groups.active.sort((a, b) => new Date(b.scheduledStart) - new Date(a.scheduledStart)); // Newest first
    groups.history.sort((a, b) => new Date(b.scheduledEnd) - new Date(a.scheduledEnd)); // Newest finished first

    return groups;
  }, [filteredBookings]);

  const currentBooking = selectedBooking || active[0] || upcoming[0] || history[0];

  const renderBookingCard = (booking, groupType) => {
    const isSelected = currentBooking?._id === booking._id;
    const s = getStatusStyle(booking.status);

    return (
      <div
        key={booking._id}
        onClick={() => setSelectedBooking(booking)}
        className={`group relative overflow-hidden rounded-2xl border p-3.5 cursor-pointer transition-all duration-300 ${isSelected
            ? 'bg-gradient-to-br from-white/10 to-transparent border-white/20 shadow-[0_5px_20px_rgba(0,0,0,0.3)] scale-[1.01]'
            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
          }`}
      >
        {isSelected && (
          <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} rounded-full mix-blend-overlay blur-3xl opacity-40`} />
        )}

        <div className="flex justify-between items-center gap-3 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <LicensePlate plate={booking.licensePlate} />
            <p className="text-xs font-semibold text-white/80 line-clamp-1">{booking.userId?.fullName || 'Guest'}</p>
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border} ${s.glow}`}>
            {booking.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] relative z-10 mt-3 text-white/60">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-amber-400" />
            <span className="font-medium">{booking.floorId?.name || 'Floor'} - {booking.parkingSlot}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-sky-400" />
            <span className="font-medium">{safeFormat(booking.scheduledStart, 'HH:mm')} - {safeFormat(booking.scheduledEnd, 'HH:mm')}</span>
          </div>
        </div>

        {groupType === 'ACTIVE' && (
          <ProgressBar start={booking.scheduledStart} end={booking.scheduledEnd} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#09090b] text-white p-4 md:p-8 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-100 relative overflow-hidden"
      style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '40px 40px' }}>

      <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

      <Toaster position="top-right" toastOptions={{ className: 'bg-[#18181b] text-white border border-white/10 shadow-2xl' }} />

        {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 shrink-0 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Calendar className="text-white" size={20} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Booking Management</h1>
          </div>
          <p className="text-white/50 text-sm max-w-xl font-medium">Monitor all reservations, active parking sessions, and historical data in real-time.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-[#121214] border border-white/10 rounded-2xl p-1.5 shadow-lg">
            <div className="flex flex-col items-center px-5 py-1">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-0.5">Active</span>
              <span className="text-emerald-400 font-black text-xl leading-none drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{active.length}</span>
            </div>
            <div className="w-px bg-white/10 my-1" />
            <div className="flex flex-col items-center px-5 py-1">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-0.5">Upcoming</span>
              <span className="text-amber-400 font-black text-xl leading-none drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">{upcoming.length}</span>
            </div>
            <div className="w-px bg-white/10 my-1" />
            <div className="flex flex-col items-center px-5 py-1">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-0.5">Total</span>
              <span className="text-white font-black text-xl leading-none">{filteredBookings.length}</span>
            </div>
          </div>

          <div className="flex items-center bg-[#121214] rounded-2xl border border-white/10 p-1.5 shadow-lg relative overflow-hidden">
            <button
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center justify-center px-4 min-w-[140px]">
              <span className="text-emerald-400 text-[9px] uppercase tracking-[0.2em] font-black mb-0.5">{format(currentDate, 'EEEE')}</span>
              <span className="text-lg font-bold leading-none text-white">{format(currentDate, 'MMM dd, yyyy')}</span>
            </div>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-wrap gap-4 items-center mb-6 shrink-0 relative z-10">
        <div className="relative w-full md:w-[350px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search plate, name, slot..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#121214]/80 backdrop-blur-md border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner font-medium"
          />
        </div>

        <div className="relative group min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors" size={18} />
          <select
            value={selectedFloor}
            onChange={e => setSelectedFloor(e.target.value)}
            className="appearance-none w-full bg-[#121214]/80 backdrop-blur-md border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer shadow-inner"
          >
            <option value="all" className="bg-[#121214]">All Floors</option>
            {floors.map(f => (
              <option key={f._id} value={f._id} className="bg-[#121214]">{f.name}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none rotate-90" size={16} />
        </div>
      </div>

      {/* --- MAIN CONTENT SPLIT VIEW --- */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8 relative z-10">

        {/* LEFT PANEL: Booking List */}
        <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-4 pb-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <span className="font-medium tracking-wide">Syncing bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[32px] bg-white/[0.02] text-white/40">
              <Car size={48} className="mb-4 opacity-30 text-white/50" />
              <p className="font-medium">No bookings found for this day.</p>
            </div>
          ) : (
            <>
              {/* Active Section */}
              {active.length > 0 && (
                <section className="space-y-4">
                  <div className="sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-20 py-3 border-b border-white/5">
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      Currently Parked ({active.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {active.map(b => renderBookingCard(b, 'ACTIVE'))}
                  </div>
                </section>
              )}

              {/* Upcoming Section */}
              {upcoming.length > 0 && (
                <section className="space-y-4">
                  <div className="sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-20 py-3 border-b border-white/5 mt-4">
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400 flex items-center gap-2">
                      <Clock size={14} />
                      Arriving Soon ({upcoming.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {upcoming.map(b => renderBookingCard(b, 'UPCOMING'))}
                  </div>
                </section>
              )}

              {/* History Section */}
              {history.length > 0 && (
                <section className="space-y-4">
                  <div className="sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-20 py-3 border-b border-white/5 mt-4">
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-white/50 flex items-center gap-2">
                      <CheckCircle size={14} />
                      History ({history.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {history.map(b => renderBookingCard(b, 'HISTORY'))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL: Details View */}
        <div className="flex-1 bg-[#121214]/60 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden hidden md:flex flex-col relative">
          {!currentBooking ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent">
              <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-[#09090b] shadow-inner shadow-white/5">
                <LayoutGrid size={32} className="text-white/40" />
              </div>
              <p className="text-lg font-medium tracking-wide">Select a booking to view details</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Hero Header */}
              <div className="relative shrink-0 bg-gradient-to-b from-[#18181b] to-[#121214] border-b border-white/5 p-10 overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-overlay blur-[100px] opacity-10" />
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay blur-[80px] opacity-10" />

                <div className="relative z-10 flex flex-col gap-8">

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-3 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-400" /> Booking Reference
                      </p>
                      <div className="flex items-end gap-5">
                        <LicensePlate plate={currentBooking.licensePlate} size="lg" />
                        <div className="mb-1">
                          <p className="text-xs font-semibold text-white/50 mb-1">Internal Ref ID</p>
                          <p className="text-sm font-mono text-white bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                            {currentBooking._id?.toUpperCase() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] border shadow-lg backdrop-blur-md
                        ${getStatusStyle(currentBooking.status).bg} 
                        ${getStatusStyle(currentBooking.status).text} 
                        ${getStatusStyle(currentBooking.status).border}
                      `}>
                        {currentBooking.status === 'CANCELLED' && <XCircle size={14} />}
                        {currentBooking.status === 'COMPLETED' && <CheckCircle size={14} />}
                        {currentBooking.status === 'ACTIVE' && <Activity size={14} className="animate-pulse" />}
                        {currentBooking.status}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Scrollable Details */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                <div className="max-w-4xl mx-auto space-y-8">

                  {/* Timeline Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-[#121214] border border-white/10 text-white/40">
                      <ArrowRight size={18} />
                    </div>

                    <div className="group rounded-[32px] bg-gradient-to-br from-[#18181b] to-[#121214] border border-white/5 p-8 hover:border-white/10 transition-all shadow-xl">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2">
                        <Clock size={14} className="text-sky-400" /> Start Schedule
                      </p>
                      <div className="flex items-baseline gap-3">
                        <p className="text-5xl font-extrabold text-white tracking-tight">{safeFormat(currentBooking.scheduledStart, 'HH:mm')}</p>
                        <p className="text-sm font-medium text-white/50">{safeFormat(currentBooking.scheduledStart, 'MMM dd, yyyy')}</p>
                      </div>
                    </div>

                    <div className="group rounded-[32px] bg-gradient-to-br from-[#18181b] to-[#121214] border border-white/5 p-8 hover:border-white/10 transition-all shadow-xl">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2">
                        <Clock size={14} className="text-amber-400" /> End Schedule
                      </p>
                      <div className="flex items-baseline gap-3">
                        <p className="text-5xl font-extrabold text-white tracking-tight">{safeFormat(currentBooking.scheduledEnd, 'HH:mm')}</p>
                        <p className="text-sm font-medium text-white/50">{safeFormat(currentBooking.scheduledEnd, 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Customer */}
                    <div className="rounded-[28px] bg-[#09090b]/50 border border-white/5 p-6 hover:bg-white/[0.02] transition-colors overflow-hidden">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shrink-0">
                          <User size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Customer</p>
                          <p className="text-lg font-bold text-white truncate" title={currentBooking.userId?.fullName}>{currentBooking.userId?.fullName || 'Guest User'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <p className="text-xs font-medium text-white/40 shrink-0">Email</p>
                          <p className="text-xs font-semibold text-white truncate max-w-[60%] text-right" title={currentBooking.userId?.email}>{currentBooking.userId?.email || 'N/A'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs font-medium text-white/40 shrink-0">Phone</p>
                          <p className="text-xs font-semibold text-white truncate">{currentBooking.userId?.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="rounded-[28px] bg-[#09090b]/50 border border-white/5 p-6 hover:bg-white/[0.02] transition-colors overflow-hidden">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400 shrink-0">
                          <MapPin size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Location</p>
                          <p className="text-lg font-bold text-white truncate" title={currentBooking.floorId?.name}>{currentBooking.floorId?.name || 'Unknown Floor'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <p className="text-xs font-medium text-white/40 shrink-0">Allocated Slot</p>
                          <p className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                            {currentBooking.parkingSlot || '—'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs font-medium text-white/40 shrink-0">Floor Level</p>
                          <p className="text-xs font-semibold text-white">{currentBooking.floorId?.floorNumber || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="rounded-[28px] bg-[#09090b]/50 border border-white/5 p-6 hover:bg-white/[0.02] transition-colors overflow-hidden">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400 shrink-0">
                          <CreditCard size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Payment</p>
                          <p className="text-lg font-bold text-white truncate">{(currentBooking.totalAmount || 0).toLocaleString()} VND</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <p className="text-xs font-medium text-white/40 shrink-0">Method</p>
                          <p className="text-xs font-semibold text-white capitalize truncate">{currentBooking.paymentMethod || 'Wallet'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs font-medium text-white/40 shrink-0">Status</p>
                          <p className={`text-xs font-bold uppercase tracking-widest truncate ${currentBooking.paymentStatus === 'PAID' ? 'text-emerald-400' :
                              currentBooking.paymentStatus === 'PENDING' ? 'text-amber-400' : 'text-red-400'
                            }`}>
                            {currentBooking.paymentStatus || currentBooking.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-[28px] bg-[#09090b]/50 border border-white/5 p-6 hover:bg-white/[0.02] transition-colors overflow-hidden">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center border border-sky-500/30 text-sky-400 shrink-0">
                          <Activity size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Summary</p>
                          <p className="text-lg font-bold text-white truncate">
                            {currentBooking.durationHours || Math.max(1, Math.round(differenceInMinutes(new Date(currentBooking.scheduledEnd), new Date(currentBooking.scheduledStart)) / 60))} Hours Total
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <p className="text-xs font-medium text-white/40 shrink-0">Created At</p>
                          <p className="text-xs font-semibold text-white/80 truncate text-right">{safeFormat(currentBooking.createdAt, 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs font-medium text-white/40 shrink-0">Last Updated</p>
                          <p className="text-xs font-semibold text-white/80 truncate text-right">{safeFormat(currentBooking.updatedAt, 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
