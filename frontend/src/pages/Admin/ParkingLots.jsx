import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Copy, Trash2, X } from "lucide-react";
import ParkingLotsBuilder from "./ParkingLotsBuilder/ParkingLotsBuilder";
import ParkingMapGrid from "../../components/ParkingMapGrid";
import { getAllFloors, createFloor, updateFloorLayout, deleteFloor } from "../../services/parkingFloorService";
import { apiFetch } from "../../services/api";

export default function ParkingLots() {
  const [floors, setFloors] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // activeSessions to track live cars - mock or fetch if admin wants live too
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    document.body.classList.add("bg-[#0b0e16]");
    return () => document.body.classList.remove("bg-[#0b0e16]");
  }, []);

  const currentFloor = floors.find(f => f._id === currentFloorId);

  const seedDefaultFloor = useCallback(async () => {
    const defaultLayout = {
      width: 1000,
      height: 600,
      elements: [
        { id: "gate-1", type: "gate", x: 20, y: 120, w: 80, h: 30, name: "ENTRANCE" },
        { id: "gate-2", type: "gate", x: 900, y: 120, w: 80, h: 30, name: "EXIT" },
        { id: "zone-1", type: "zone", x: 120, y: 50, w: 350, h: 200, name: "ZONE A - VIP", color: "purple" },
        { id: "slot-a1", type: "slot", x: 140, y: 100, w: 50, h: 70, name: "A01" },
        { id: "slot-a2", type: "slot", x: 210, y: 100, w: 50, h: 70, name: "A02" },
        { id: "slot-a3", type: "slot", x: 280, y: 100, w: 50, h: 70, name: "A03" },
        { id: "zone-2", type: "zone", x: 520, y: 50, w: 350, h: 200, name: "ZONE B - EV", color: "emerald" },
        { id: "slot-b1", type: "slot", x: 540, y: 100, w: 50, h: 70, name: "B01" },
        { id: "slot-b2", type: "slot", x: 610, y: 100, w: 50, h: 70, name: "B02" },
        { id: "planter-1", type: "planter", x: 40, y: 250, w: 30, h: 100, name: "" },
        { id: "planter-2", type: "planter", x: 930, y: 250, w: 30, h: 100, name: "" }
      ]
    };
    await createFloor({ floorNumber: 1, name: "Floor 1", layoutData: defaultLayout });
  }, []);

  const fetchFloors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllFloors();
      if (res.ok && res.data.data) {
        if (res.data.data.length === 0) {
          await seedDefaultFloor();
          const retryRes = await getAllFloors();
          if (retryRes.ok && retryRes.data.data.length > 0) {
            setFloors(retryRes.data.data);
          }
        } else {
          setFloors(res.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [seedDefaultFloor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFloors();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFloors]);

  const handleCreateFloor = async () => {
    const floorNumber = floors.length + 1;
    const name = `Floor ${floorNumber}`;
    const res = await createFloor({ floorNumber, name });
    if (res.ok && res.data.data) {
      setFloors([...floors, res.data.data]);
      setCurrentFloorId(res.data.data._id);
    }
  };

  const handleDuplicateFloor = async () => {
    if (!currentFloorId) return;
    const currentFloor = floors.find(f => f._id === currentFloorId);
    if (!currentFloor) return;

    // 1. Find max char code used across ALL floors to determine next available letters
    let maxCharCode = 64; // '@' is before 'A'
    floors.forEach(f => {
      f.layoutData?.elements?.forEach(el => {
        if (el.type.startsWith('slot') && el.name) {
          const match = el.name.match(/^([a-zA-Z])/);
          if (match) {
            const charCode = match[1].toUpperCase().charCodeAt(0);
            if (charCode > maxCharCode && charCode <= 90) { // A-Z
              maxCharCode = charCode;
            }
          }
        }
      });
    });

    // 2. Find unique prefixes used in CURRENT floor
    const sourcePrefixes = new Set();
    currentFloor.layoutData?.elements?.forEach(el => {
      if (el.type.startsWith('slot') && el.name) {
        const match = el.name.match(/^([a-zA-Z])/);
        if (match) {
          sourcePrefixes.add(match[1].toUpperCase());
        }
      }
    });
    const sortedSourcePrefixes = Array.from(sourcePrefixes).sort();

    // 3. Create mapping from old prefix to new prefix
    const prefixMapping = {};
    let nextCharCode = maxCharCode + 1;
    sortedSourcePrefixes.forEach(prefix => {
      if (nextCharCode <= 90) {
        prefixMapping[prefix] = String.fromCharCode(nextCharCode);
        nextCharCode++;
      } else {
        prefixMapping[prefix] = prefix; // fallback if out of alphabet
      }
    });

    // 4. Duplicate elements with renamed prefixes and new unique IDs
    const idMapping = {};
    const renamedElements = (currentFloor.layoutData?.elements || []).map(el => {
      const newId = `${el.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      idMapping[el.id] = newId;

      let newName = el.name;
      if (newName) {
        if (el.type.startsWith('slot')) {
          const match = newName.match(/^([a-zA-Z])/);
          if (match && prefixMapping[match[1].toUpperCase()]) {
            const oldChar = match[1];
            const newChar = prefixMapping[oldChar.toUpperCase()];
            newName = newName.replace(oldChar, newChar);
          }
        } else if (el.type === 'zone') {
          newName = newName.replace(/\b([a-zA-Z])\b/g, (match) => {
            return prefixMapping[match.toUpperCase()] || match;
          });
        }
      }
      return { ...el, id: newId, name: newName };
    });

    // 5. Update parentIds to maintain group structures
    const finalElements = renamedElements.map(el => {
      if (el.parentId && idMapping[el.parentId]) {
        return { ...el, parentId: idMapping[el.parentId] };
      }
      return el;
    });

    const newLayoutData = {
      ...currentFloor.layoutData,
      elements: finalElements
    };

    const floorNumber = floors.length + 1;
    const name = `Floor ${floorNumber}`;
    const res = await createFloor({ floorNumber, name, layoutData: newLayoutData });
    if (res.ok && res.data.data) {
      setFloors([...floors, res.data.data]);
      setCurrentFloorId(res.data.data._id);
    }
  };

  const handleDeleteFloor = async () => {
    if (!currentFloorId) return;
    const currentIndex = floors.findIndex(f => f._id === currentFloorId);
    const currentFloor = floors[currentIndex];
    if (!currentFloor) return;

    if (window.confirm(`Are you sure you want to delete ${currentFloor.name}?`)) {
       const res = await deleteFloor(currentFloorId);
       if (res.ok) {
          const updatedFloors = floors.filter(f => f._id !== currentFloorId);
          setFloors(updatedFloors);
          if (updatedFloors.length > 0) {
             const nextIndex = Math.max(0, currentIndex - 1);
             setCurrentFloorId(updatedFloors[nextIndex]._id);
          } else {
             setCurrentFloorId(null);
          }
       }
    }
  };

  const handleSaveLayout = async (layoutData) => {
    try {
      const res = await updateFloorLayout(currentFloorId, layoutData);
      if (res.ok) {
        setIsEditMode(false);
        fetchFloors();
      } else {
        alert("Failed to save map. Backend returned an error: " + (res.data?.message || "Unknown error"));
        console.error("Save Map Error:", res);
      }
    } catch (error) {
      alert("Failed to save map. Network error or session expired.");
      console.error("Save Map Exception:", error);
    }
  };

  // Fetch Active Sessions so Admin also sees live cars
  useEffect(() => {
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
      } catch (err) {
        console.error("Failed to fetch active status", err);
      }
    };
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (isEditMode && currentFloor) {
    return (
      <ParkingLotsBuilder 
        floor={currentFloor} 
        onSave={handleSaveLayout} 
        onCancel={() => setIsEditMode(false)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] bg-[#0b0e16] text-gray-200 font-sans relative overflow-hidden"
         style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '30px 30px' }}>
      
      {/* Top Toolbar */}
      <div className="absolute top-4 left-8 z-50 flex items-center gap-4 bg-[#181c23]/80 backdrop-blur border border-white/10 p-2 rounded-xl shadow-lg">
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
        
        <button onClick={handleCreateFloor} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition border border-white/10" title="Add new floor">
          <Plus size={18} className="text-cyan-400" />
        </button>

        {currentFloor && (
          <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
            <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg font-bold hover:bg-cyan-500/30 transition border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Edit size={16} /> Edit Layout ({currentFloor.name})
            </button>
            <button onClick={handleDuplicateFloor} className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition border border-white/10" title="Duplicate this floor">
              <Copy size={16} />
            </button>
            <button onClick={handleDeleteFloor} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/30" title="Delete this floor">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Map Container using reusable component */}
      <div className="flex-1 overflow-hidden relative">
        <ParkingMapGrid
          floors={floors}
          currentFloorId={currentFloorId}
          onFloorSelect={setCurrentFloorId}
          onSlotClick={setSelectedSlot}
          activeSessions={activeSessions}
          loading={loading}
          isEditMode={isEditMode}
        />
      </div>

      {/* Slide-over panel for slots */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedSlot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setSelectedSlot(null)}></div>
      <div className={`absolute top-0 right-0 bottom-0 w-[420px] bg-[#0f172a]/80 backdrop-blur-2xl border-l border-cyan-500/20 p-8 flex flex-col shadow-[-20px_0_50px_rgba(8,145,178,0.1)] text-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${selectedSlot ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedSlot && (
           <>
              <div className="flex justify-between items-start mb-6 flex-shrink-0">
                <div>
                    <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-1 block">{selectedSlot.type} Ticket</span>
                    <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
                        SLOT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{selectedSlot.id}</span>
                    </h2>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 w-8 h-8 rounded-full flex items-center justify-center transition-all border border-white/5 flex-shrink-0">
                    <X size={16} strokeWidth={2} />
                </button>
            </div>
            <div className="mb-4 flex-1 overflow-y-auto pr-2">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Slot Details</h3>
                {selectedSlot.session ? (
                  <div className="flex flex-col gap-4">
                      <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 flex flex-col items-center justify-center mb-2">
                          <span className="text-xs text-rose-400 uppercase tracking-widest font-bold mb-1">Status</span>
                          <span className="text-lg text-white font-black uppercase">Occupied</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">License Plate</span><span className="font-mono text-base font-semibold text-white bg-slate-800/80 px-3 py-1 rounded border border-slate-700/50">{selectedSlot.session.licensePlate}</span></div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Phone</span><span className="font-medium text-white">{selectedSlot.session.phone || <span className="text-slate-500 italic">Guest</span>}</span></div>
                      {selectedSlot.session.userId?.email && (
                          <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Email</span><span className="font-medium text-cyan-400">{selectedSlot.session.userId.email}</span></div>
                      )}
                      <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Vehicle Type</span><span className="font-medium text-white uppercase">{selectedSlot.session.vehicleType || 'Unknown'}</span></div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Check-in Time</span><span className="font-medium text-white">{new Date(selectedSlot.session.checkInTime).toLocaleString('vi-VN')}</span></div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5"><span className="text-slate-400 text-sm">Expected Duration</span><span className="font-medium text-white">{selectedSlot.session.expectedDurationHours} hr(s)</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Expiration Time</span><span className="font-bold text-rose-400">{new Date(new Date(selectedSlot.session.checkInTime).getTime() + (selectedSlot.session.expectedDurationHours || 0) * 3600000).toLocaleString('vi-VN')}</span></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 h-full items-center justify-center text-center py-10 opacity-70">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 mb-2">
                          <span className="text-slate-500 font-bold text-2xl">P</span>
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest">Slot is Empty</p>
                      <p className="text-xs text-slate-500 max-w-[200px]">Ready for next incoming vehicle assignment.</p>
                  </div>
                )}
            </div>
           </>
        )}
      </div>

    </div>
  );
}
