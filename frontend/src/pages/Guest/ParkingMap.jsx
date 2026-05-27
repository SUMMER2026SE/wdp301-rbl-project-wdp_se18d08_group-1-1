import React, { useState, useEffect } from 'react';
import { 
  Car, Zap, Star, ShieldAlert, Circle, 
  Map as MapIcon, ChevronRight, Info, CheckCircle2, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─── Mock Data ──────────────────────────────────────────────────────────── */
const generateMockData = () => {
  const data = [];
  
  // Zone A - Standard (12 slots)
  for (let i = 1; i <= 12; i++) {
    const statuses = ['available', 'available', 'occupied', 'occupied', 'available', 'maintenance'];
    const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
    data.push({
      id: `A-${i.toString().padStart(2, '0')}`,
      zone: 'A',
      type: 'standard',
      status: randStatus,
      price: '10,000₫/h',
    });
  }

  // Zone B - VIP (8 slots)
  for (let i = 1; i <= 8; i++) {
    const statuses = ['available', 'occupied', 'reserved', 'available'];
    const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
    data.push({
      id: `B-${i.toString().padStart(2, '0')}`,
      zone: 'B',
      type: 'vip',
      status: randStatus,
      price: '30,000₫/h',
    });
  }

  // Zone C - EV (6 slots)
  for (let i = 1; i <= 6; i++) {
    const statuses = ['available', 'occupied', 'available'];
    const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
    data.push({
      id: `C-${i.toString().padStart(2, '0')}`,
      zone: 'C',
      type: 'ev',
      status: randStatus,
      price: '20,000₫/h + EV',
    });
  }

  return data;
};

export default function ParkingMap() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check login state
    const raw = sessionStorage.getItem('valo_user');
    if (raw) setUser(JSON.parse(raw));

    // Mock initial data
    setSlots(generateMockData());

    // Optional: Auto-refresh data to simulate live
    const interval = setInterval(() => {
      setSlots(generateMockData());
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  /* ─── Stats ─── */
  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.status === 'available').length;
  const occupiedSlots = slots.filter(s => s.status === 'occupied' || s.status === 'reserved').length;

  /* ─── Helpers ─── */
  const getSlotColor = (status, type) => {
    if (status === 'occupied') return 'bg-gray-100 border-gray-300 text-gray-400 opacity-60 cursor-not-allowed';
    if (status === 'reserved') return 'bg-amber-100 border-amber-300 text-amber-600 opacity-80 cursor-not-allowed';
    if (status === 'maintenance') return 'bg-red-50 border-red-200 text-red-400 opacity-50 cursor-not-allowed';
    
    // Available colors by type
    if (type === 'vip') return 'bg-gradient-to-br from-gold/10 to-yellow-500/20 border-gold/40 text-gold-dark hover:border-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer';
    if (type === 'ev') return 'bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-300 text-blue-600 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] cursor-pointer';
    
    // Standard available
    return 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer';
  };

  const getTypeIcon = (type) => {
    if (type === 'vip') return <Star size={14} className="text-gold" />;
    if (type === 'ev') return <Zap size={14} className="text-blue-500" />;
    return <Car size={14} className="text-emerald-500" />;
  };

  const getStatusLabel = (status) => {
    const map = {
      available: 'Trống',
      occupied: 'Đã đỗ',
      reserved: 'Đã đặt trước',
      maintenance: 'Bảo trì',
    };
    return map[status] || status;
  };

  const handleSlotClick = (slot) => {
    if (slot.status !== 'available') return;
    if (!user) {
      navigate('/login');
    } else {
      navigate('/booking', { state: { selectedSlot: slot.id } });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-28 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── HEADER & STATS ─── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <MapIcon size={20} className="text-gold-dark" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Live Parking Map</h1>
            </div>
            <p className="text-gray-500 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Cập nhật trực tiếp thời gian thực
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[120px]">
              <span className="text-3xl font-black text-gray-900">{totalSlots}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Tổng chỗ</span>
            </div>
            <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex flex-col items-center min-w-[120px] shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
              <span className="text-3xl font-black text-emerald-600">{availableSlots}</span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Trống</span>
            </div>
            <div className="bg-gray-100 px-5 py-3 rounded-2xl border border-gray-200 flex flex-col items-center min-w-[120px]">
              <span className="text-3xl font-black text-gray-500">{occupiedSlots}</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Đã đầy</span>
            </div>
          </div>
        </div>

        {/* ─── LEGEND ─── */}
        <div className="flex flex-wrap items-center gap-6 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <div className="w-4 h-4 rounded-md border border-emerald-400 bg-emerald-50"></div>
            Standard (Trống)
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <div className="w-4 h-4 rounded-md border border-gold bg-gold/10"></div>
            VIP (Trống)
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <div className="w-4 h-4 rounded-md border border-blue-400 bg-blue-50"></div>
            EV Charging (Trống)
          </div>
          <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            <div className="w-4 h-4 rounded-md border border-gray-300 bg-gray-100"></div>
            Đã có xe
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            <div className="w-4 h-4 rounded-md border border-amber-300 bg-amber-100"></div>
            Đã đặt trước
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
            <div className="w-4 h-4 rounded-md border border-red-200 bg-red-50"></div>
            Bảo trì
          </div>
        </div>

        {/* ─── 2D MAP AREA ─── */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-x-auto relative">
          
          {/* Driveway lines (Decorative) */}
          <div className="absolute top-1/2 left-0 right-0 h-16 -translate-y-1/2 border-y-2 border-dashed border-gray-200 pointer-events-none flex items-center justify-center gap-20">
             <ChevronRight size={32} className="text-gray-200" />
             <ChevronRight size={32} className="text-gray-200" />
             <ChevronRight size={32} className="text-gray-200" />
             <ChevronRight size={32} className="text-gray-200" />
          </div>

          <div className="min-w-[900px] flex flex-col gap-16 relative z-10">
            
            {/* ── Zone A: Standard ── */}
            <div className="relative">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
                <span className="text-4xl font-black text-gray-100 uppercase tracking-widest whitespace-nowrap">Zone A</span>
              </div>
              <div className="ml-12 grid grid-cols-6 gap-x-4 gap-y-20">
                {slots.filter(s => s.zone === 'A').map((slot, idx) => (
                  <SlotCard 
                    key={slot.id} 
                    slot={slot} 
                    idx={idx} 
                    onHover={setHoveredSlot} 
                    isHovered={hoveredSlot === slot.id}
                    onClick={() => handleSlotClick(slot)}
                    colorClass={getSlotColor(slot.status, slot.type)}
                    typeIcon={getTypeIcon(slot.type)}
                    statusLabel={getStatusLabel(slot.status)}
                  />
                ))}
              </div>
            </div>

            {/* ── Driveway middle space ── */}
            <div className="h-4"></div>

            <div className="flex gap-12">
              {/* ── Zone B: VIP ── */}
              <div className="relative flex-1 border-r-2 border-dashed border-gray-200 pr-12">
                <div className="flex items-center gap-2 mb-6 ml-12">
                  <Star size={20} className="text-gold" />
                  <h3 className="text-lg font-black text-gray-900 tracking-wide">ZONE B - VIP</h3>
                </div>
                <div className="ml-12 grid grid-cols-4 gap-x-4 gap-y-16">
                  {slots.filter(s => s.zone === 'B').map((slot, idx) => (
                    <SlotCard 
                      key={slot.id} 
                      slot={slot} 
                      idx={idx} 
                      onHover={setHoveredSlot} 
                      isHovered={hoveredSlot === slot.id}
                      onClick={() => handleSlotClick(slot)}
                      colorClass={getSlotColor(slot.status, slot.type)}
                      typeIcon={getTypeIcon(slot.type)}
                      statusLabel={getStatusLabel(slot.status)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Zone C: EV Charging ── */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2 mb-6">
                  <Zap size={20} className="text-blue-500" />
                  <h3 className="text-lg font-black text-gray-900 tracking-wide">ZONE C - EV</h3>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-16">
                  {slots.filter(s => s.zone === 'C').map((slot, idx) => (
                    <SlotCard 
                      key={slot.id} 
                      slot={slot} 
                      idx={idx} 
                      onHover={setHoveredSlot} 
                      isHovered={hoveredSlot === slot.id}
                      onClick={() => handleSlotClick(slot)}
                      colorClass={getSlotColor(slot.status, slot.type)}
                      typeIcon={getTypeIcon(slot.type)}
                      statusLabel={getStatusLabel(slot.status)}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Slot Component ─── */
function SlotCard({ slot, idx, onHover, isHovered, onClick, colorClass, typeIcon, statusLabel }) {
  const isTopRow = idx < 6;

  return (
    <div 
      className="relative w-full aspect-[1/2] flex flex-col items-center justify-center group"
      onMouseEnter={() => onHover(slot.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Parking Lines */}
      <div className="absolute inset-0 border-x-[3px] border-t-[3px] border-gray-300/50 rounded-t-lg pointer-events-none"></div>
      
      {/* The Slot Box */}
      <div className={`
        relative w-[85%] h-[85%] rounded-lg border-2 flex flex-col items-center justify-center
        transition-all duration-300 ease-out transform
        ${colorClass}
        ${slot.status === 'available' ? 'group-hover:-translate-y-2 group-active:scale-95' : ''}
      `}>
        {/* Top/Bottom orientation for aesthetic */}
        <div className="absolute top-2 right-2">{typeIcon}</div>
        
        {/* Car Icon if occupied */}
        {(slot.status === 'occupied' || slot.status === 'reserved') ? (
          <Car size={40} className="mb-2 opacity-50" strokeWidth={1.5} />
        ) : slot.status === 'maintenance' ? (
          <ShieldAlert size={32} className="mb-2 opacity-50 text-red-500" strokeWidth={1.5} />
        ) : (
          <Circle size={16} className="mb-2 opacity-30" strokeWidth={3} />
        )}

        <span className="font-bold text-lg tracking-tight">{slot.id}</span>
      </div>

      {/* Tooltip */}
      <div className={`
        absolute bottom-full mb-4 z-50 w-48 p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100
        transition-all duration-200 pointer-events-none
        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <span className="font-black text-gray-900">{slot.id}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{slot.zone}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Trạng thái</span>
            <span className="font-semibold text-gray-800">{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Loại ô</span>
            <span className="font-semibold text-gray-800 uppercase">{slot.type}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Giá vé</span>
            <span className="font-bold text-gold-dark">{slot.price}</span>
          </div>
        </div>
        
        {slot.status === 'available' && (
          <div className="mt-3 pt-2 border-t border-gray-100 text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1">
              <CheckCircle2 size={12} />
              Nhấn để đặt ngay
            </span>
          </div>
        )}
        {(slot.status === 'occupied' || slot.status === 'reserved') && (
          <div className="mt-3 pt-2 border-t border-gray-100 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <Lock size={12} />
              Không thể đặt
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
