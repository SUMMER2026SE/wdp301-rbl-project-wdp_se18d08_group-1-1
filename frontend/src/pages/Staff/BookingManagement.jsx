import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, startOfDay, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, XCircle, Search, Filter, Loader2, ArrowRight, Car, ShieldCheck, CreditCard, Activity } from 'lucide-react';
import { getAllFloors } from '../../services/parkingFloorService';
import { getAllBookings } from '../../services/bookingService';
import toast, { Toaster } from 'react-hot-toast';

// --- Helper Functions ---
const getBookingGroup = (status, startTime) => {
  if (['ACTIVE', 'PAUSED'].includes(status)) return 'ACTIVE';
  if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status)) return 'HISTORY';
  // If it's PENDING/PAID, check if it's upcoming
  return 'UPCOMING';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'PAID': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'PENDING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'COMPLETED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'CANCELLED': case 'EXPIRED': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-white/10 text-white/50 border-white/20';
  }
};

const LicensePlate = ({ plate, size = 'sm' }) => (
  <div className={`inline-flex items-center justify-center border-2 border-white/70 rounded-md bg-black/60 font-mono font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ${size === 'sm' ? 'px-2 py-0.5 text-sm' : 'px-3 py-1.5 text-xl'}`}>
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
    <div className="w-full mt-3">
      <div className="flex justify-between text-[10px] text-emerald-400/70 mb-1.5 font-medium uppercase tracking-wider">
        <span>Parked Duration</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
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
    fetchData();
  }, [currentDate]);

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
      toast.error('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

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

  // Handle auto-selection of first item
  useEffect(() => {
    if (!selectedBooking && filteredBookings.length > 0) {
      // Prioritize active, then upcoming, then history
      if (active.length > 0) setSelectedBooking(active[0]);
      else if (upcoming.length > 0) setSelectedBooking(upcoming[0]);
      else if (history.length > 0) setSelectedBooking(history[0]);
    }
  }, [filteredBookings, active, upcoming, history, selectedBooking]);

  const renderBookingCard = (booking, groupType) => {
    const isSelected = selectedBooking?._id === booking._id;
    return (
      <div 
        key={booking._id}
        onClick={() => setSelectedBooking(booking)}
        className={`group relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'bg-white/10 border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/10' 
            : 'bg-[#111]/60 border-white/5 hover:bg-white/[0.08] hover:border-white/15 shadow-sm'
        }`}
      >
        {isSelected && (
          <motion.div 
            layoutId="active-selection" 
            className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#ffd555] to-amber-600 shadow-[0_0_10px_rgba(255,213,85,0.5)]" 
          />
        )}
        
        <div className="flex justify-between items-start mb-3">
          <LicensePlate plate={booking.licensePlate} />
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
              {booking.status}
            </span>
            <span className="text-xs font-semibold text-white/50">{format(new Date(booking.scheduledStart), 'HH:mm')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/70">
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
            <MapPin size={14} className="text-[#ffd555]" />
            <span className="font-bold text-white tracking-wide">{booking.floorId?.name}-{booking.parkingSlot}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <User size={14} className="text-white/40" />
            <span className="truncate">{booking.userId?.fullName || 'Guest'}</span>
          </div>
        </div>

        {groupType === 'ACTIVE' && (
          <ProgressBar start={booking.scheduledStart} end={booking.scheduledEnd} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#080808] text-white p-4 md:p-8 flex flex-col font-sans selection:bg-[#ffd555] selection:text-black">
      <Toaster position="top-right" toastOptions={{ className: 'bg-[#111] text-white border border-white/10' }} />
      
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 shrink-0 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffd555] to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,213,85,0.3)]">
              <Calendar className="text-[#0B0E17]" size={20} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Booking Management</h1>
          </div>
          <p className="text-white/50 text-sm max-w-xl">Real-time premium dashboard for monitoring all reservations, active parking sessions, and historical data.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-4 px-6 py-2.5 bg-[#111] border border-white/10 rounded-2xl shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Active</span>
              <span className="text-emerald-400 font-bold text-lg">{active.length}</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Upcoming</span>
              <span className="text-amber-400 font-bold text-lg">{upcoming.length}</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Total</span>
              <span className="text-white font-bold text-lg">{filteredBookings.length}</span>
            </div>
          </div>

          <div className="flex items-center bg-[#111] rounded-2xl border border-white/10 p-1.5 shadow-lg">
            <button 
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white hover:shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center justify-center px-4 py-1 min-w-[150px]">
              <span className="text-[#ffd555] text-[10px] uppercase tracking-widest font-black mb-0.5">{format(currentDate, 'EEEE')}</span>
              <span className="text-lg font-bold leading-none">{format(currentDate, 'MMM dd, yyyy')}</span>
            </div>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white hover:shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-wrap gap-4 items-center mb-6 shrink-0 relative z-10">
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#ffd555] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search plate, name, slot..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ffd555]/50 focus:ring-1 focus:ring-[#ffd555]/50 transition-all shadow-inner"
          />
        </div>
        
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#ffd555] transition-colors" size={18} />
          <select
            value={selectedFloor}
            onChange={e => setSelectedFloor(e.target.value)}
            className="appearance-none bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-sm text-white focus:outline-none focus:border-[#ffd555]/50 focus:ring-1 focus:ring-[#ffd555]/50 transition-all cursor-pointer shadow-inner"
          >
            <option value="all" className="bg-[#111]">All Floors</option>
            {floors.map(f => (
              <option key={f._id} value={f._id} className="bg-[#111]">{f.name}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none rotate-90" size={16} />
        </div>
      </div>

      {/* --- MAIN CONTENT SPLIT VIEW --- */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 relative z-10">
        
        {/* LEFT PANEL: Booking List */}
        <div className="w-full lg:w-[450px] xl:w-[500px] shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
              <Loader2 className="animate-spin" size={32} />
              <span>Syncing bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/30">
              <Car size={48} className="mb-4 opacity-20" />
              <p>No bookings found for this day.</p>
            </div>
          ) : (
            <>
              {/* Active Section */}
              {active.length > 0 && (
                <section className="space-y-3">
                  <div className="sticky top-0 bg-[#080808]/90 backdrop-blur-md z-10 py-2 border-b border-white/5">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-emerald-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Currently Parked ({active.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {active.map(b => renderBookingCard(b, 'ACTIVE'))}
                  </div>
                </section>
              )}

              {/* Upcoming Section */}
              {upcoming.length > 0 && (
                <section className="space-y-3">
                  <div className="sticky top-0 bg-[#080808]/90 backdrop-blur-md z-10 py-2 border-b border-white/5 mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-amber-400 flex items-center gap-2">
                      <Clock size={16} />
                      Arriving Soon ({upcoming.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {upcoming.map(b => renderBookingCard(b, 'UPCOMING'))}
                  </div>
                </section>
              )}

              {/* History Section */}
              {history.length > 0 && (
                <section className="space-y-3">
                  <div className="sticky top-0 bg-[#080808]/90 backdrop-blur-md z-10 py-2 border-b border-white/5 mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-white/40 flex items-center gap-2">
                      <CheckCircle size={16} />
                      History ({history.length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {history.map(b => renderBookingCard(b, 'HISTORY'))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL: Details View */}
        <div className="flex-1 bg-[#111]/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden hidden md:flex flex-col relative">
          {!selectedBooking ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center mb-6 bg-black/20">
                <LayoutGrid size={32} />
              </div>
              <p className="text-lg">Select a booking to view details</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar">
              {/* Hero Header */}
              <div className="relative h-48 bg-gradient-to-br from-[#1A1A24] to-[#0A0A0F] border-b border-white/5 p-8 flex flex-col justify-end overflow-hidden">
                {/* Background Decor */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#ffd555] rounded-full mix-blend-overlay filter blur-[100px] opacity-10" />
                <div className="absolute left-10 bottom-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-overlay filter blur-[80px] opacity-10" />
                
                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Booking Reference</span>
                    <h2 className="text-4xl font-black text-white flex items-center gap-4">
                      <LicensePlate plate={selectedBooking.licensePlate} size="lg" />
                    </h2>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border backdrop-blur-md shadow-xl ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Left Column: Timing & User */}
                <div className="space-y-8">
                  {/* Schedule Card */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                      <Clock size={14} /> Schedule Window
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-lg">{format(new Date(selectedBooking.scheduledStart), 'HH:mm')}</p>
                        <p className="text-white/40 text-xs mt-1">{format(new Date(selectedBooking.scheduledStart), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center px-4">
                        <div className="h-px bg-white/10 w-full relative">
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111] px-2 text-white/30 text-[10px] font-bold">
                            {selectedBooking.durationHours} HRS
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">{format(new Date(selectedBooking.scheduledEnd), 'HH:mm')}</p>
                        <p className="text-white/40 text-xs mt-1">{format(new Date(selectedBooking.scheduledEnd), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Card */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 shadow-inner flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <User className="text-white/50" size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Customer Info</h3>
                      <p className="text-lg font-bold text-white">{selectedBooking.userId?.fullName || 'Guest'}</p>
                      <p className="text-white/50 text-sm">{selectedBooking.userId?.email || 'No email provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Location & Payment */}
                <div className="space-y-8">
                  {/* Location Card */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                      <MapPin size={14} /> Assigned Location
                    </h3>
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffd555] to-amber-600 flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,213,85,0.3)]">
                        <span className="text-[10px] text-[#0B0E17] font-bold uppercase leading-none opacity-80">Slot</span>
                        <span className="text-xl font-black text-[#0B0E17] leading-none mt-1">{selectedBooking.parkingSlot}</span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-white font-bold text-lg">{selectedBooking.floorId?.name}</p>
                        <p className="text-white/50 text-sm">Level {selectedBooking.floorId?.floorNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Card */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                      <CreditCard size={14} /> Transaction Details
                    </h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-white/60 text-sm">Total Amount</span>
                      <span className="text-white font-bold text-xl">{selectedBooking.totalAmount?.toLocaleString()} VND</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60">Payment Method</span>
                      <span className="text-white/90 font-medium capitalize flex items-center gap-2">
                        {selectedBooking.paymentMethod}
                        <ShieldCheck size={14} className="text-emerald-400" />
                      </span>
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
