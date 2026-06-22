import React, { useState, useEffect } from 'react';
import { Info, AlertCircle, X, Clock, CreditCard, ArrowRight, Minus, Plus, CarFront } from 'lucide-react';
import ParkingMapViewer from '../../components/ParkingMapViewer';

export default function KioskStep2({ formData, updateFormData, onNext, onBack }) {
  const [floors, setFloors] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbSlots, setDbSlots] = useState([]);
  const [ticketPackages, setTicketPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  useEffect(() => {
    const fetchDbSlots = async () => {
      if (!currentFloorId) {
        setDbSlots([]);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors/${currentFloorId}/slots`);
        const data = await res.json();
        if (data.success) {
          setDbSlots(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch slots", err);
      }
    };
    fetchDbSlots();
  }, [currentFloorId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Floors
        const floorRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors`);
        const floorData = await floorRes.json();
        if (floorData.success) {
          setFloors(floorData.data);
          if (floorData.data.length > 0) {
            setCurrentFloorId(floorData.data[0]._id);
          }
        } else {
          setError(floorData.message);
        }

        // Fetch Active Sessions
        const sessionRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sessions/active-status`);
        const sessionData = await sessionRes.json();
        if (sessionData.success) {
          setActiveSessions(sessionData.data);
        }
        // Fetch Ticket Packages
        const packagesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages/active`);
        const packagesData = await packagesRes.json();
        if (packagesData.success) {
          const pkgList = packagesData.data || [];
          setTicketPackages(pkgList);
          if (pkgList.length > 0) {
            setSelectedPackageId(pkgList[0]._id);
            updateFormData({ ticketPackageId: pkgList[0]._id });
          }
        }
      } catch (err) {
        setError('Failed to fetch data. Please check network.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDurationChange = (delta) => {
    const newVal = formData.durationHours + delta;
    if (newVal >= 1 && newVal <= 24) {
      updateFormData({ durationHours: newVal });
    }
  };

  const estimatedCharge = React.useMemo(() => {
    const pkg = ticketPackages.find(p => p._id === selectedPackageId);
    if (!pkg) return 0;
    if (pkg.type === 'hourly') {
      return formData.durationHours * pkg.price;
    } else if (pkg.type === 'daily') {
      const days = Math.ceil(formData.durationHours / 24);
      return days * pkg.price;
    }
    return 0;
  }, [ticketPackages, selectedPackageId, formData.durationHours]);

  const closePanel = () => {
    updateFormData({ selectedSlot: null, floorId: null });
  };

  return (
    <div className="flex flex-col flex-1 w-full mx-auto pb-0 relative h-full">

      {/* ─── MAIN FRAME containing Map and Overlays ─── */}
      <div className="flex-1 rounded-[32px] overflow-hidden relative flex flex-col w-full min-h-0 pt-0 pb-0 shadow-sm border border-[#0b0e16]">
        
        {/* ─── FULL WIDTH 2D MAP ─── */}
        <div className="flex-1 w-full relative overflow-hidden bg-[#0b0e16] shadow-inner flex items-center justify-center">
          
          {/* Floor Selection (Overlay Top) */}
          <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 z-30 px-6 pointer-events-auto">
            {floors.map(f => (
              <button
                key={f._id}
                onClick={() => setCurrentFloorId(f._id)}
                className={`px-8 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${currentFloorId === f._id
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-[#181c23]/80 border border-white/10 text-gray-400 hover:text-white hover:bg-[#1f242d]/80 backdrop-blur'
                  }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center z-10">
              <div className="text-cyan-400 font-bold text-xl animate-pulse tracking-widest">LOADING MAP...</div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-4 z-10">
              <AlertCircle size={48} />
              <div className="font-bold">{error}</div>
            </div>
          ) : (
            <ParkingMapViewer
              floors={floors}
              currentFloorId={currentFloorId}
              onFloorSelect={setCurrentFloorId}
              activeSessions={activeSessions}
              dbSlots={dbSlots}
              selectedSlotId={formData.selectedSlot}
              onSelectSlot={(slot, floorId) => updateFormData({ selectedSlot: slot.id, floorId })}
              is2DMode={true}
              hideUI={true}
              theme="dark"
              initialZoom={0.5}
            />
          )}

          {/* Legend Overlay (Bottom) */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none px-4">
            <div className="bg-[#181c23]/80 backdrop-blur border border-white/10 px-6 py-3 rounded-full flex items-center gap-4 shadow-lg pointer-events-auto">
              <p className="text-cyan-400 font-black text-[10px] uppercase tracking-widest pr-2 hidden sm:block">Status Legend</p>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-white border border-gray-300"></div>
                <span className="text-[10px] text-gray-300 font-bold tracking-wide">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-red-500/20 border border-red-500"></div>
                <span className="text-[10px] text-gray-300 font-bold tracking-wide">Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-cyan-500 border border-cyan-400"></div>
                <span className="text-[10px] text-gray-300 font-bold tracking-wide">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-red-200 border border-red-500" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 4px, rgba(127, 29, 29, 0.3) 4px, rgba(127, 29, 29, 0.3) 8px)' }}></div>
                <span className="text-[10px] text-gray-300 font-bold tracking-wide">Maintenance</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SLIDING RIGHT PANEL ─── */}
        {/* Dimmed Background Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 z-40 rounded-[32px]
        ${formData.selectedSlot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={closePanel}
        ></div>

        <div className="absolute top-0 right-0 h-full z-50 overflow-hidden rounded-r-[32px] pointer-events-none">
          {/* Sliding Panel */}
          <div
            className={`relative w-[400px] h-full bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-500 ease-out pointer-events-auto
          ${formData.selectedSlot ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-sm font-black text-[#0f172a] tracking-widest uppercase flex items-center gap-2">
                Booking Details
              </h3>
              <button onClick={closePanel} className="text-gray-400 hover:text-[#0f172a] bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-all">
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-y-auto">

              {/* Premium Slot Card */}
              <div className="bg-[#0f172a] rounded-[24px] p-6 mb-8 text-white shadow-xl relative overflow-hidden shrink-0">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                  <CarFront size={120} />
                </div>

                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Slot</p>
                  <div className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider">
                    Available
                  </div>
                </div>
                <p className="text-[46px] font-black tracking-tight leading-none mb-4">{formData.selectedSlot || '--'}</p>

                <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Zone</p>
                    <p className="font-bold text-sm">Standard</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-medium">Rate</p>
                    <p className="font-bold text-sm text-[#FFDF00]">$6.00 / hr</p>
                  </div>
                </div>
              </div>

              {/* Ticket Package Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <CreditCard size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Select Package</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {ticketPackages.map(pkg => (
                    <button
                      key={pkg._id}
                      onClick={() => {
                        setSelectedPackageId(pkg._id);
                        updateFormData({ ticketPackageId: pkg._id });
                        // Default duration if daily
                        if (pkg.type === 'daily' && formData.durationHours < 24) {
                          updateFormData({ durationHours: 24 });
                        }
                      }}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${selectedPackageId === pkg._id ? 'border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm' : 'border-gray-200 bg-white hover:border-cyan-300'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm">{pkg.name}</span>
                        <span className="font-black text-cyan-600">{pkg.price.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        {pkg.type} / {pkg.type === 'daily' ? '1 Day' : '1 Hour'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Duration Stepper */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Duration</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white border border-gray-200 shadow-sm rounded-full p-2">
                  <button
                    onClick={() => handleDurationChange(-1)}
                    className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 hover:text-black active:scale-90 transition-all border border-gray-100"
                  >
                    <Minus size={20} strokeWidth={2.5} />
                  </button>

                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-3xl font-black text-[#0f172a] leading-none mb-0.5">{formData.durationHours}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Hours</span>
                  </div>

                  <button
                    onClick={() => handleDurationChange(1)}
                    className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 hover:text-black active:scale-90 transition-all border border-gray-100"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Receipt / Total Section */}
              <div className="mt-auto">
                <div className="border-t-2 border-dashed border-gray-200 pt-6 pb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 font-medium">Estimated Charge</span>
                    <span className="text-sm font-bold text-gray-700">{estimatedCharge.toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-500 font-medium">Taxes & Fees</span>
                    <span className="text-sm font-bold text-gray-700">$0.00</span>
                  </div>

                  <div className="flex justify-between items-end bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-[#0f172a]">
                      <CreditCard size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Estimated Fee</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-black text-[#0f172a] leading-none">{estimatedCharge.toLocaleString('vi-VN')} VND</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center mt-3 font-medium">
                    * Payment will be processed at checkout based on actual parking duration.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center gap-3 mt-4">
                  <button
                    onClick={onBack}
                    className="flex-1 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold py-4 rounded-2xl transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={onNext}
                    disabled={!formData.selectedSlot}
                    className={`flex-[2] flex items-center justify-center gap-2 text-lg font-bold py-4 rounded-2xl transition-all ${!formData.selectedSlot
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#FFDF00] text-[#0f172a] hover:bg-[#e6c800] shadow-[0_8px_20px_rgba(255,223,0,0.3)] active:scale-95'
                      }`}
                  >
                    Next Step
                    <ArrowRight size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ─── END MAIN DARK FRAME ─── */}

      {/* Floating Back Button (Space always reserved) */}
      <div className={`mt-6 flex justify-center z-50 transition-all duration-500 shrink-0 ${formData.selectedSlot ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={onBack}
          className="bg-[#0f172a] hover:bg-black text-white font-bold text-lg px-14 py-4 rounded-full transition-all active:scale-95"
        >
          Back
        </button>
      </div>
    </div>
  );
}
