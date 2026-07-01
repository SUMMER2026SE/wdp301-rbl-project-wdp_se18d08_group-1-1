import React, { useState, useEffect } from 'react';
import {
  Car, Zap, Star, ShieldAlert, Circle,
  Map as MapIcon, ChevronRight, Info, CheckCircle2, Lock,
  Filter, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLiveMapData } from '../../services/parkingFloorService';
import { createBookingHold } from '../../services/bookingService';

export default function ParkingMap() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [user, setUser] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('all'); // all, standard, vip, ev
  const [filterStatus, setFilterStatus] = useState('all'); // all, available

  // Guest Modal state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedGuestSlot, setSelectedGuestSlot] = useState(null);

  const fetchLiveMapData = async () => {
    try {
      const res = await getLiveMapData();
      if (res.ok && res.data && res.data.data) {
        setSlots(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Check login state
    const raw = sessionStorage.getItem('valo_user') || localStorage.getItem('valo_user');
    if (raw) setUser(JSON.parse(raw));

    fetchLiveMapData();

    // Auto-refresh data to simulate live
    const interval = setInterval(() => {
      fetchLiveMapData();
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  /* ─── Stats ─── */
  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.status === 'available').length;
  const occupiedSlots = slots.filter(s => s.status === 'occupied' || s.status === 'reserved').length;

  /* ─── Filter Logic ─── */
  const filteredSlots = slots.filter(slot => {
    if (filterType !== 'all' && slot.type !== filterType) return false;
    if (filterStatus === 'available' && slot.status !== 'available') return false;
    return true;
  });

  /* ─── Helpers ─── */
  const getSlotColor = (status, type) => {
    if (status === 'occupied') return 'bg-gray-100 border-gray-300 text-gray-400 opacity-60 cursor-not-allowed shadow-inner';
    if (status === 'reserved') return 'bg-amber-100/50 border-amber-300 text-amber-600 opacity-80 cursor-not-allowed shadow-inner';
    if (status === 'maintenance') return 'bg-red-50 border-red-200 text-red-400 opacity-50 cursor-not-allowed shadow-inner';

    // Available colors by type (Premium styling)
    if (type === 'vip') return 'bg-gradient-to-br from-[#fffdf0] to-[#fff8c2] border-[#e6c15a] text-[#c99a2e] hover:border-[#d4af37] hover:shadow-[0_8px_25px_rgba(212,175,55,0.3)] cursor-pointer ring-1 ring-white/50';
    if (type === 'ev') return 'bg-gradient-to-br from-[#f0f7ff] to-[#d6ebff] border-[#8cbcf5] text-[#3b82f6] hover:border-[#60a5fa] hover:shadow-[0_8px_25px_rgba(59,130,246,0.3)] cursor-pointer ring-1 ring-white/50';

    // Standard available
    return 'bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] border-[#86efac] text-[#10b981] hover:border-[#34d399] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] cursor-pointer ring-1 ring-white/50';
  };

  const getTypeIcon = (type) => {
    if (type === 'vip') return <Star size={16} className="text-[#d4af37] drop-shadow-sm" />;
    if (type === 'ev') return <Zap size={16} className="text-blue-500 drop-shadow-sm" />;
    return <Car size={16} className="text-emerald-500 drop-shadow-sm" />;
  };

  const getStatusLabel = (status) => {
    const map = {
      available: 'Available',
      occupied: 'Occupied',
      reserved: 'Reserved',
      maintenance: 'Maintenance',
    };
    return map[status] || status;
  };

  const handleSlotClick = async (slot) => {
    if (slot.status !== 'available') return;
    
    try {
      const res = await createBookingHold({ floorId: slot.floorId, slotCode: slot.id });
      if (res.ok) {
        if (!user) {
          setSelectedGuestSlot(slot);
          setShowGuestModal(true);
        } else {
          navigate('/booking', { state: { selectedSlot: slot.id } });
        }
      } else {
        alert(res.data?.message || 'Không thể giữ chỗ lúc này.');
      }
    } catch (error) {
      console.error('Hold error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-28 pb-20">
      {/* ─── GUEST MODAL ─── */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 text-amber-500 mx-auto border border-amber-100">
              <Lock size={32} />
            </div>

            <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Yêu cầu đăng nhập</h2>
            <p className="text-gray-500 text-center mb-8">
              Tuyệt vời! Ô đỗ <strong className="text-gray-900">{selectedGuestSlot?.id}</strong> đang trống. Vui lòng đăng nhập hoặc tạo tài khoản để Valo Parking có thể giữ chỗ cho bạn.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-0.5"
              >
                Đăng nhập ngay
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3.5 px-4 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all"
              >
                Tạo tài khoản mới
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── GUEST BANNER ─── */}
        {!user && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Star size={20} className="text-yellow-500" /> Trải nghiệm đỗ xe thông minh
              </h3>
              <p className="text-gray-300">Đăng ký tài khoản để đặt chỗ trước, theo dõi xe và thanh toán không tiền mặt ngay hôm nay.</p>
            </div>
            <div className="relative z-10 shrink-0">
              <button onClick={() => navigate('/register')} className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all hover:scale-105">
                Đăng ký ngay
              </button>
            </div>
          </div>
        )}

        {/* ─── HEADER & STATS ─── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                <MapIcon size={24} className="text-gray-700" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Live Parking Map</h1>
            </div>
            <p className="text-gray-500 flex items-center gap-2 font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live real-time updates
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[120px]">
              <span className="text-4xl font-black text-gray-900">{totalSlots}</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tổng chỗ</span>
            </div>
            <div className="flex-1 lg:flex-none bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 flex flex-col items-center min-w-[120px] shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
              <span className="text-4xl font-black text-emerald-600 relative z-10">{availableSlots}</span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mt-1 relative z-10">Đang Trống</span>
            </div>
            <div className="flex-1 lg:flex-none bg-gray-50 px-6 py-4 rounded-2xl border border-gray-200 flex flex-col items-center min-w-[120px]">
              <span className="text-4xl font-black text-gray-500">{occupiedSlots}</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Đã Đầy</span>
            </div>
          </div>
        </div>

        {/* ─── FILTERS & LEGEND ─── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 mr-2 text-gray-500 font-semibold text-sm uppercase tracking-wider">
              <Filter size={16} /> Lọc:
            </div>
            <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl gap-1 w-full sm:w-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterType('standard')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${filterType === 'standard' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Car size={14} className={filterType === 'standard' ? 'text-emerald-500' : ''} /> Standard
              </button>
              <button
                onClick={() => setFilterType('vip')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${filterType === 'vip' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Star size={14} className={filterType === 'vip' ? 'text-yellow-500' : ''} /> VIP
              </button>
              <button
                onClick={() => setFilterType('ev')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${filterType === 'ev' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Zap size={14} className={filterType === 'ev' ? 'text-blue-500' : ''} /> EV
              </button>
            </div>

            <div className="flex w-full sm:w-auto bg-gray-100 p-1 rounded-xl gap-1 mt-2 sm:mt-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mọi trạng thái
              </button>
              <button
                onClick={() => setFilterStatus('available')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${filterStatus === 'available' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <CheckCircle2 size={14} /> Chỉ xem chỗ trống
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 xl:border-l xl:pl-6 border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
              <div className="w-4 h-4 rounded-md bg-gray-100 shadow-inner border border-gray-200"></div>
              Đã có xe
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
              <div className="w-4 h-4 rounded-md bg-amber-100/50 shadow-inner border border-amber-200"></div>
              Đã đặt trước
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide">
              <div className="w-4 h-4 rounded-md bg-red-50 shadow-inner border border-red-200"></div>
              Bảo trì
            </div>
          </div>
        </div>

        {/* ─── RESPONSIVE MAP AREA ─── */}
        <div className="w-full flex flex-col gap-8">

          {/* ── Zone A: Standard ── */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400"></div>
            <div className="flex items-center gap-3 mb-6 pl-4">
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                <Car size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Zone A</h2>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Khu vực Tiêu Chuẩn</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {slots.filter(s => s.zone === 'A').map((slot, idx) => {
                const isVisible = filteredSlots.some(fs => fs.id === slot.id);
                if (!isVisible && filterType !== 'all') return null; // Hide completely if filtered out to save space
                return (
                  <div key={slot.id} className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                    <SlotCard
                      slot={slot}
                      onHover={setHoveredSlot}
                      isHovered={hoveredSlot === slot.id}
                      onClick={() => handleSlotClick(slot)}
                      colorClass={getSlotColor(slot.status, slot.type)}
                      typeIcon={getTypeIcon(slot.type)}
                      statusLabel={getStatusLabel(slot.status)}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8">
            {/* ── Zone B: VIP ── */}
            <div className="flex-1 bg-gradient-to-br from-yellow-50 to-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-yellow-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
              <div className="flex items-center gap-3 mb-6 pl-4">
                <div className="bg-yellow-100 text-yellow-600 p-2 rounded-xl">
                  <Star size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Zone B</h2>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Khu vực VIP</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
                {slots.filter(s => s.zone === 'B').map((slot, idx) => {
                  const isVisible = filteredSlots.some(fs => fs.id === slot.id);
                  if (!isVisible && filterType !== 'all') return null;
                  return (
                    <div key={slot.id} className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                      <SlotCard
                        slot={slot}
                        onHover={setHoveredSlot}
                        isHovered={hoveredSlot === slot.id}
                        onClick={() => handleSlotClick(slot)}
                        colorClass={getSlotColor(slot.status, slot.type)}
                        typeIcon={getTypeIcon(slot.type)}
                        statusLabel={getStatusLabel(slot.status)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Zone C: EV Charging ── */}
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-blue-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-400"></div>
              <div className="flex items-center gap-3 mb-6 pl-4">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                  <Zap size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Zone C</h2>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Khu vực Sạc EV</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-4 md:gap-6">
                {slots.filter(s => s.zone === 'C').map((slot, idx) => {
                  const isVisible = filteredSlots.some(fs => fs.id === slot.id);
                  if (!isVisible && filterType !== 'all') return null;
                  return (
                    <div key={slot.id} className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                      <SlotCard
                        slot={slot}
                        onHover={setHoveredSlot}
                        isHovered={hoveredSlot === slot.id}
                        onClick={() => handleSlotClick(slot)}
                        colorClass={getSlotColor(slot.status, slot.type)}
                        typeIcon={getTypeIcon(slot.type)}
                        statusLabel={getStatusLabel(slot.status)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

/* ─── Slot Component ─── */
function SlotCard({ slot, onHover, isHovered, onClick, colorClass, typeIcon, statusLabel }) {
  return (
    <div
      className="relative w-full aspect-[4/5] flex flex-col items-center justify-center group"
      onMouseEnter={() => onHover(slot.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* The Slot Box */}
      <div className={`
        relative w-full h-full rounded-2xl flex flex-col items-center justify-center
        transition-all duration-300 ease-out transform
        ${colorClass}
        ${slot.status === 'available' ? 'group-hover:-translate-y-2 group-hover:shadow-lg group-active:scale-95' : ''}
      `}>
        {/* Top/Bottom orientation for aesthetic */}
        <div className="absolute top-3 right-3 bg-white/60 backdrop-blur-sm p-1.5 rounded-lg shadow-sm">{typeIcon}</div>

        {/* Center Icon */}
        <div className="flex-1 flex flex-col items-center justify-center w-full mt-4">
          {(slot.status === 'occupied' || slot.status === 'reserved') ? (
            <Car size={40} className="mb-2 opacity-30 text-gray-600" strokeWidth={1.5} />
          ) : slot.status === 'maintenance' ? (
            <ShieldAlert size={32} className="mb-2 opacity-60 text-red-500" strokeWidth={1.5} />
          ) : (
            <Circle size={16} className="mb-2 opacity-20" strokeWidth={4} />
          )}

          <span className="font-black text-xl tracking-tighter drop-shadow-sm">{slot.id}</span>
        </div>
      </div>

      {/* Tooltip */}
      <div className={`
        absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700
        transition-all duration-300 pointer-events-none transform origin-bottom
        ${isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
      `}>
        {/* Triangle pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 bg-gray-900/95 rotate-45 border-r border-b border-gray-700"></div>

        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700/50">
          <span className="text-xl font-black text-white">{slot.id}</span>
          <span className="text-[10px] font-black text-gray-900 bg-white px-2 py-1 rounded-md uppercase tracking-wider">{slot.zone}</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 font-medium">Trạng thái</span>
            <span className="font-bold text-gray-100">{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 font-medium">Loại ô</span>
            <span className="font-bold text-gray-100 uppercase flex items-center gap-1">
              {typeIcon} {slot.type}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 font-medium">Giá vé</span>
            <span className="font-black text-yellow-400">{slot.price}</span>
          </div>
        </div>

        {slot.status === 'available' && (
          <div className="mt-4 pt-3 border-t border-gray-700/50 text-center">
            <div className="bg-emerald-500/20 text-emerald-400 rounded-lg py-2 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              Nhấn để đặt ngay
            </div>
          </div>
        )}
        {(slot.status === 'occupied' || slot.status === 'reserved') && (
          <div className="mt-4 pt-3 border-t border-gray-700/50 text-center">
            <div className="bg-gray-800 text-gray-400 rounded-lg py-2 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Lock size={14} />
              Không thể đặt
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
