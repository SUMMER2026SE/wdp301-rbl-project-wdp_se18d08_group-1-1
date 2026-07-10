import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, startOfDay, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, XCircle, Clock3, Filter, Search } from 'lucide-react';
import { getAllFloors } from '../../services/parkingFloorService';
import { getAllBookings } from '../../services/bookingService';
import toast, { Toaster } from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: 'from-amber-500/20 to-amber-600/20 border-amber-500/50 text-amber-300',
  PAID: 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-300',
  ACTIVE: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/50 text-emerald-300',
  COMPLETED: 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400',
  CANCELLED: 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-300',
};

const STATUS_ICONS = {
  PENDING: <Clock3 size={12} />,
  PAID: <CheckCircle size={12} />,
  ACTIVE: <CheckCircle size={12} />,
  COMPLETED: <CheckCircle size={12} />,
  CANCELLED: <XCircle size={12} />,
};

const BookingManagement = () => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [floors, setFloors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredBooking, setHoveredBooking] = useState(null);

  const scrollRef = useRef(null);

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
    } catch (error) {
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Process floors to get all slots
  const timelineData = useMemo(() => {
    let slots = [];
    floors.forEach(floor => {
      if (selectedFloor !== 'all' && floor._id !== selectedFloor) return;
      
      // Look for slots in elements array (from FloorLayout structure)
      const floorElements = floor.layoutData?.elements || [];
      const floorSlots = floorElements.filter(e => e.type && e.type.startsWith('slot'));
      
      floorSlots.forEach(slot => {
        const label = slot.name || slot.id || 'N/A';
        slots.push({
          id: `${floor._id}-${label}`,
          floorId: floor._id,
          floorName: floor.name,
          slotLabel: label,
          type: slot.type || 'regular',
          bookings: []
        });
      });
    });

    // Sort slots logically (e.g. A1, A2, B1...)
    slots.sort((a, b) => a.slotLabel.localeCompare(b.slotLabel, undefined, { numeric: true }));

    // Map bookings to slots
    bookings.forEach(b => {
      const slotId = `${b.floorId?._id || b.floorId}-${b.parkingSlot}`;
      const slot = slots.find(s => s.id === slotId);
      if (slot) {
        slot.bookings.push(b);
      }
    });

    // Filter by search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      slots = slots.filter(s => {
        if (s.slotLabel.toLowerCase().includes(lowerQ)) return true;
        return s.bookings.some(b => 
          b.licensePlate?.toLowerCase().includes(lowerQ) ||
          b.userId?.fullName?.toLowerCase().includes(lowerQ)
        );
      });
    }

    return slots;
  }, [floors, bookings, selectedFloor, searchQuery]);

  // Generate 24 hours for Y-axis
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Helper to calculate position and height of a booking block vertically
  const getBookingStyle = (booking) => {
    const dayStart = startOfDay(currentDate);
    const dayEnd = addDays(dayStart, 1);
    
    let start = new Date(booking.scheduledStart);
    let end = new Date(booking.scheduledEnd);

    // Cap visual bounds to the current day
    if (isBefore(start, dayStart)) start = dayStart;
    if (isAfter(end, dayEnd)) end = dayEnd;

    const startMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);

    const top = (startMinutes / 1440) * 100;
    const height = (durationMinutes / 1440) * 100;

    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.min(100 - top, height)}%`,
      left: '4px',
      right: '4px'
    };
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-white h-[calc(100vh-80px)] flex flex-col">
      <Toaster position="top-right" />
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-2">
            Schedule Monitor
          </h1>
          <p className="text-white/50 text-sm">Apple Calendar-style timeline of all parking slots and reservations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
            <button 
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center justify-center px-4 py-1 font-medium min-w-[140px]">
              <span className="text-valo-primary text-xs uppercase tracking-wider font-bold mb-0.5">{format(currentDate, 'EEEE')}</span>
              <span className="text-lg leading-none">{format(currentDate, 'MMM dd, yyyy')}</span>
            </div>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search slot, plate, name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-valo-primary/50 transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <select
              value={selectedFloor}
              onChange={e => setSelectedFloor(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-valo-primary/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-gray-900">All Floors</option>
              {floors.map(f => (
                <option key={f._id} value={f._id} className="bg-gray-900">{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 text-xs font-medium text-white/60">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/50"></span> Active</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-500/50"></span> Pending</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-500/40 border border-gray-500/50"></span> Completed</div>
        </div>
      </div>

      {/* ── Apple Calendar-Style Vertical Timeline ── */}
      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0">
        
        {/* Header Row (Slots) */}
        <div className="flex border-b border-white/10 bg-black/40 shadow-sm z-20">
          {/* Top-Left Corner */}
          <div className="w-16 md:w-20 shrink-0 border-r border-white/10 p-2 flex flex-col items-center justify-center text-[10px] text-white/40 uppercase font-bold tracking-wider">
            Time
          </div>
          {/* Slots Columns Headers */}
          <div className="flex-1 flex overflow-x-auto custom-scrollbar" onScroll={(e) => {
            if(scrollRef.current) scrollRef.current.scrollLeft = e.target.scrollLeft;
          }}>
            {loading ? (
              <div className="p-4 text-sm text-white/40">Loading slots...</div>
            ) : timelineData.length === 0 ? (
              <div className="p-4 text-sm text-white/40">No slots found.</div>
            ) : (
              timelineData.map(slot => (
                <div key={slot.id} className="min-w-[120px] md:min-w-[150px] flex-1 shrink-0 border-r border-white/5 p-3 flex flex-col items-center justify-center">
                  <span className="font-bold text-white text-sm md:text-base">{slot.slotLabel}</span>
                  <span className="text-[10px] text-white/40 truncate w-full text-center">{slot.floorName}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Body (Hours & Calendar Grid) */}
        <div className="flex-1 flex overflow-y-auto custom-scrollbar bg-[#1C1C1E] relative">
          {/* Left Column (Hours) */}
          <div className="w-16 md:w-20 shrink-0 border-r border-white/10 bg-[#1C1C1E] z-10">
            <div className="relative h-[1440px]"> {/* 60px per hour => 24 * 60 = 1440px */}
              {hours.map(h => (
                <div 
                  key={h} 
                  className="absolute w-full text-right pr-2 text-xs text-white/40 font-medium"
                  style={{ top: `${(h / 24) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>
          </div>

          {/* Right Area (Scrollable Slots Grid) */}
          <div className="flex-1 overflow-x-auto custom-scrollbar" ref={scrollRef}>
            <div className="flex relative h-[1440px] min-w-full w-fit">
              
              {/* Horizontal Grid Lines for every hour */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {hours.map(h => (
                  <div 
                    key={h} 
                    className="absolute w-full border-t border-white/[0.04]"
                    style={{ top: `${(h / 24) * 100}%` }}
                  />
                ))}
              </div>

              {/* Slot Columns */}
              {timelineData.map(slot => (
                <div key={slot.id} className="min-w-[120px] md:min-w-[150px] flex-1 shrink-0 border-r border-white/[0.04] relative z-10 group">
                  {/* Highlight column on hover */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Booking Blocks */}
                  {slot.bookings.map(booking => {
                    const style = getBookingStyle(booking);
                    const colorClasses = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
                    const Icon = STATUS_ICONS[booking.status];
                    
                    return (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute rounded-md bg-gradient-to-b border backdrop-blur-md shadow-lg p-1.5 cursor-pointer transition-all hover:z-30 hover:ring-2 hover:ring-white/50 overflow-hidden ${colorClasses}`}
                        style={style}
                        onMouseEnter={() => setHoveredBooking(booking)}
                        onMouseLeave={() => setHoveredBooking(null)}
                      >
                        <div className="flex flex-col h-full overflow-hidden">
                          <div className="flex items-center gap-1 mb-0.5 opacity-80">
                            {Icon}
                            <span className="text-[10px] font-bold leading-none truncate">
                              {format(new Date(booking.scheduledStart), 'HH:mm')}
                            </span>
                          </div>
                          <span className="text-xs md:text-sm font-bold text-white truncate leading-tight">
                            {booking.licensePlate}
                          </span>
                          <span className="text-[10px] opacity-70 truncate mt-auto">
                            {booking.userId?.fullName || 'Guest'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredBooking && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-8 right-8 z-50 w-80 bg-gray-900 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">{hoveredBooking.licensePlate}</h3>
                <p className="text-white/40 text-xs mt-0.5">{hoveredBooking._id}</p>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                hoveredBooking.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                hoveredBooking.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/10 text-white/60'
              }`}>
                {hoveredBooking.status}
              </span>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-white/70">
                <User size={16} className="text-white/40" />
                <span>{hoveredBooking.userId?.fullName || 'Guest'}</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <MapPin size={16} className="text-white/40" />
                <span>{hoveredBooking.floorId?.name} - Slot {hoveredBooking.parkingSlot}</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Clock size={16} className="text-white/40" />
                <div className="flex flex-col">
                  <span>{format(new Date(hoveredBooking.scheduledStart), 'MMM dd, yyyy - HH:mm')}</span>
                  <span className="text-white/40 text-xs">to {format(new Date(hoveredBooking.scheduledEnd), 'HH:mm')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingManagement;
