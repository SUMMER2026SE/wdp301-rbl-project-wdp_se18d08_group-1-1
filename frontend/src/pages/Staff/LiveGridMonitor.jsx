import { useEffect, useState } from "react";
import ParkingMapGrid from "../../components/ParkingMapGrid";
import { getAllFloors } from "../../services/parkingFloorService";
import { apiFetch } from "../../services/api";
import { MonitorCheck, X } from "lucide-react";
import StaffCheckoutModal from "./StaffCheckoutModal";
import { getAvailableBookingSlots, getActiveHolds, getActiveMapBookings } from "../../services/bookingService";

export default function LiveGridMonitor() {
  const [floors, setFloors] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [availableSlots, setAvailableSlots] = useState(null);
  const [activeHolds, setActiveHolds] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [dbSlots, setDbSlots] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    const fetchDbSlots = async () => {
      try {
        const { getFloorSlots } = await import('../../services/parkingFloorService');
        if (currentFloorId) {
          const res = await getFloorSlots(currentFloorId);
          if (res.ok && res.data.success) {
            setDbSlots(res.data.data);
          }
        } else {
          if (floors.length === 0) {
            setDbSlots([]);
            return;
          }
          const promises = floors.map(f => getFloorSlots(f._id));
          const results = await Promise.all(promises);
          const allSlots = results.flatMap(r => (r.ok && r.data.success) ? r.data.data : []);
          setDbSlots(allSlots);
        }
      } catch (e) {
        console.error("Failed to fetch slots", e);
      }
    };
    fetchDbSlots();
  }, [currentFloorId, floors]);

  useEffect(() => {
    document.body.classList.add("bg-[#0b0e16]");
    return () => document.body.classList.remove("bg-[#0b0e16]");
  }, []);

  const fetchFloors = async () => {
    setLoading(true);
    try {
      const res = await getAllFloors();
      if (res.ok && res.data.data) {
        setFloors(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchLiveStatus = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await apiFetch("/sessions/active-status", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok && res.data.success) {
        setActiveSessions(res.data.data);
      }

      const startTimeStr = new Date().toISOString();
      const endTimeStr = new Date(Date.now() + 60 * 1000).toISOString();
      const availableRes = await getAvailableBookingSlots({
        startTime: startTimeStr,
        endTime: endTimeStr,
      });
      if (availableRes.ok && availableRes.data?.data?.slots) {
        setAvailableSlots(availableRes.data.data.slots);
      }

      const holdsRes = await getActiveHolds();
      if (holdsRes.ok && holdsRes.data?.data) {
        setActiveHolds(holdsRes.data.data);
      }
      
      const bookingsRes = await getActiveMapBookings();
      if (bookingsRes.ok && bookingsRes.data?.data) {
        setActiveBookings(bookingsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch live status", err);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchFloors();
      fetchLiveStatus();
    }, 0);
    const interval = setInterval(fetchLiveStatus, 15000); // refresh every 15s
    return () => {
      window.clearTimeout(timerId);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] bg-[#0b0e16] text-gray-200 font-sans relative overflow-hidden"
         style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '30px 30px' }}>
      
      {/* Top Toolbar */}
      <div className="absolute top-4 left-8 z-50 flex items-center gap-4 bg-[#181c23]/80 backdrop-blur border border-white/10 p-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 px-3 border-r border-white/10">
            <MonitorCheck size={18} className="text-emerald-400" />
            <span className="font-bold text-white tracking-widest uppercase text-xs">Live Monitor</span>
        </div>
        <select 
          className="bg-black/40 border border-white/20 rounded p-2 text-white text-sm outline-none font-bold min-w-[120px]"
          value={currentFloorId || ""}
          onChange={(e) => setCurrentFloorId(e.target.value === "" ? null : e.target.value)}
        >
          {floors.length > 0 && <option value="">-- Overview (All Floors) --</option>}
          {floors.map(f => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
          {floors.length === 0 && <option value="">No floors available</option>}
        </select>
        <div className="flex items-center gap-1.5 px-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-mono">LIVE UPDATE</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ParkingMapGrid
          floors={floors}
          currentFloorId={currentFloorId}
          onFloorSelect={setCurrentFloorId}
          onSlotClick={setSelectedSlot}
          activeSessions={activeSessions}
          dbSlots={dbSlots}
          availableSlots={availableSlots}
          activeHolds={activeHolds}
          activeBookings={activeBookings}
          loading={loading}
          isEditMode={false} // Staff cannot edit layout
        />
      </div>

      {/* Slide-over panel for slots */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedSlot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setSelectedSlot(null)}></div>
      <div className={`absolute top-0 right-0 bottom-0 w-[420px] bg-[#0f172a]/95 backdrop-blur-3xl border-l border-emerald-500/20 p-8 flex flex-col shadow-[-20px_0_50px_rgba(16,185,129,0.1)] text-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${selectedSlot ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedSlot && (
           <>
              <div className="flex justify-between items-start mb-6 flex-shrink-0">
                <div>
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] mb-1 block">{selectedSlot.type} TICKET</span>
                    <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
                        SLOT <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">{selectedSlot.id}</span>
                    </h2>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 w-8 h-8 rounded-full flex items-center justify-center transition-all border border-white/5 flex-shrink-0">
                    <X size={16} strokeWidth={2} />
                </button>
            </div>
            
            <div className="mb-4 flex-1 overflow-y-auto pr-2">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Slot Details</h3>
                
                {(() => {
                  const dbSlotInfo = dbSlots.find(s => s.slotNumber === selectedSlot.id && s.floorID === selectedSlot.floorId);
                  const isMaintenance = dbSlotInfo?.status === 'maintenance';

                  if (isMaintenance) {
                    return (
                      <div className="flex flex-col gap-4 h-full items-center justify-center text-center py-10 opacity-80">
                          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/50 mb-2">
                              <span className="text-red-500 font-bold text-2xl">⚠</span>
                          </div>
                          <p className="text-red-400 font-bold uppercase tracking-widest">Under Maintenance</p>
                          <p className="text-xs text-red-500 max-w-[200px]">This slot is currently locked for maintenance.</p>
                      </div>
                    );
                  }

                  if (selectedSlot.session) {
                    return (
                        <div className="flex flex-col gap-4">
                            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center justify-center mb-2">
                                <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-1">Status</span>
                                <span className="text-lg text-white font-black uppercase">Occupied</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">License Plate</span><span className="font-mono text-base font-semibold text-white bg-slate-800/80 px-3 py-1 rounded border border-slate-700/50">{selectedSlot.session.licensePlate}</span></div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Phone</span><span className="font-medium text-white">{selectedSlot.session.phone || <span className="text-slate-500 italic">Guest</span>}</span></div>
                            {selectedSlot.session.userId?.email && (
                                <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Email</span><span className="font-medium text-emerald-400">{selectedSlot.session.userId.email}</span></div>
                            )}
                            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Vehicle Type</span><span className="font-medium text-white uppercase">{selectedSlot.session.vehicleType || 'Unknown'}</span></div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Check-in Time</span><span className="font-medium text-white">{new Date(selectedSlot.session.checkInTime).toLocaleString('vi-VN')}</span></div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Expected Duration</span><span className="font-medium text-white">{selectedSlot.session.expectedDurationHours} hr(s)</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Expiration Time</span><span className="font-bold text-emerald-400">{new Date(new Date(selectedSlot.session.checkInTime).getTime() + (selectedSlot.session.expectedDurationHours || 0) * 3600000).toLocaleString('vi-VN')}</span></div>
                        </div>
                    );
                  }

                  if (selectedSlot.isReserved) {
                    return (
                        <div className="flex flex-col gap-4">
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex flex-col items-center justify-center mb-2">
                                <span className="text-xs text-purple-400 uppercase tracking-widest font-bold mb-1">Status</span>
                                <span className="text-lg text-white font-black uppercase">Reserved / VIP</span>
                            </div>
                            {dbSlotInfo?.subscriptionDetail ? (
                              <>
                                {dbSlotInfo.subscriptionDetail.user && (
                                  <>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Customer Name</span><span className="font-medium text-white">{dbSlotInfo.subscriptionDetail.user.username || 'N/A'}</span></div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Phone</span><span className="font-medium text-white">{dbSlotInfo.subscriptionDetail.user.phone || 'N/A'}</span></div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Email</span><span className="font-medium text-emerald-400">{dbSlotInfo.subscriptionDetail.user.email || 'N/A'}</span></div>
                                  </>
                                )}
                                {dbSlotInfo.subscriptionDetail.ticketPackage && (
                                  <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Package</span><span className="font-medium text-purple-400 uppercase">{dbSlotInfo.subscriptionDetail.ticketPackage.name || dbSlotInfo.subscriptionDetail.ticketPackage.type}</span></div>
                                )}
                                <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Valid Until</span><span className="font-bold text-purple-400">{new Date(dbSlotInfo.subscriptionDetail.expireAt).toLocaleString('vi-VN')}</span></div>
                              </>
                            ) : (
                              <p className="text-xs text-purple-300 text-center mt-4">This slot is currently reserved for a VIP subscription package or an upcoming booking.</p>
                            )}
                        </div>
                    );
                  }

                  return (
                      <div className="flex flex-col gap-4 h-full items-center justify-center text-center py-10 opacity-70">
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 mb-2">
                              <MonitorCheck size={24} className="text-slate-500" />
                          </div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest">Slot is Empty</p>
                          <p className="text-xs text-slate-500 max-w-[200px]">Ready for next incoming vehicle assignment.</p>
                      </div>
                  );
                })()}
            </div>

            {selectedSlot.session && (
              <div className="mt-auto flex-shrink-0 pt-2 pb-2">
                 <button 
                    onClick={() => setShowCheckoutModal(true)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold uppercase tracking-wider py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
                    <X size={18} />
                    Process Check-out
                 </button>
              </div>
            )}
           </>
        )}
      </div>

      {showCheckoutModal && selectedSlot?.session && (
        <StaffCheckoutModal 
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          session={{...selectedSlot.session, parkingSlot: selectedSlot.id}}
          onSuccess={() => {
            setShowCheckoutModal(false);
            setSelectedSlot(null);
            fetchLiveStatus();
          }}
        />
      )}
    </div>
  );
}
