import React, { useEffect, useState, useRef } from "react";
import { Car, Zap, ZoomIn, ZoomOut, Maximize, TreePine, X, Plus, Edit, Phone, ArrowRight, Accessibility, Bike, Navigation, Layers, MonitorSmartphone, Copy, Trash2 } from "lucide-react";
import ParkingLotsBuilder from "./ParkingLotsBuilder/ParkingLotsBuilder";
import { getAllFloors, createFloor, updateFloorLayout, deleteFloor } from "../../services/parkingFloorService";

export default function ParkingLots() {
  const [floors, setFloors] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // 3D Camera Controls
  const [camera, setCamera] = useState({ rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 });
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);

  // Reference for the container to prevent default scroll
  const containerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("bg-[#0b0e16]");
    return () => document.body.classList.remove("bg-[#0b0e16]");
  }, []);

  // Prevent default scroll on wheel in the container
  useEffect(() => {
    const container = containerRef.current;
    const handleWheelNative = (e) => {
      if (isEditMode) return;
      e.preventDefault();
      setCamera((prev) => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(prev.zoom - e.deltaY * 0.002, 3))
      }));
    };
    if (container) {
      container.addEventListener("wheel", handleWheelNative, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheelNative);
      }
    };
  }, [isEditMode]);

  const seedDefaultFloor = async () => {
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
  };

  const fetchFloors = async () => {
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
  };

  useEffect(() => {
    fetchFloors();
  }, []);

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

    const floorNumber = floors.length + 1;
    const name = `Floor ${floorNumber}`;
    const res = await createFloor({ floorNumber, name, layoutData: currentFloor.layoutData });
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

  // --- MOUSE CONTROLS ---
  const handleMouseDown = (e) => {
    if (isEditMode) return;
    setIsDragging(true);
    let action = 'orbit';
    if (e.button === 2 || e.button === 1 || e.shiftKey) {
      action = 'pan';
    }
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      action,
      startCamera: { ...camera }
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart || isEditMode) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (dragStart.action === 'orbit') {
      // Left click = Orbit
      setCamera({
        ...dragStart.startCamera,
        rotZ: dragStart.startCamera.rotZ + deltaX * 0.5,
        rotX: Math.max(0, Math.min(90, dragStart.startCamera.rotX - deltaY * 0.5))
      });
    } else if (dragStart.action === 'pan') {
      // Right/Middle/Shift click = Pan
      setCamera({
        ...dragStart.startCamera,
        panX: dragStart.startCamera.panX + deltaX,
        panY: dragStart.startCamera.panY + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleContextMenu = (e) => {
    if (!isEditMode) e.preventDefault();
  };

  const currentFloor = floors.find(f => f._id === currentFloorId);

  // In Edit Mode, render the 2D Builder directly
  if (isEditMode && currentFloor) {
    return (
      <ParkingLotsBuilder 
        floor={currentFloor} 
        onSave={handleSaveLayout} 
        onCancel={() => setIsEditMode(false)} 
      />
    );
  }

  const renderDynamicElements = (elements) => {
    if (!elements) return null;
    return elements.map(el => {
      const style = {
        position: 'absolute',
        left: `${el.x}px`,
        top: `${el.y}px`,
        width: `${el.w}px`,
        height: `${el.h}px`,
        transform: `translateZ(1px) rotateZ(${el.rot || 0}deg)`, // Slight pop out from floor
        transformStyle: 'preserve-3d'
      };

      if (el.type === 'zone') {
        const themeColor = el.color || 'purple';
        const borderColors = { purple: '#a855f7', emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b' };
        const bgColors = { purple: 'rgba(168,85,247,0.1)', emerald: 'rgba(16,185,129,0.1)', blue: 'rgba(59,130,246,0.1)', amber: 'rgba(245,158,11,0.1)' };
        
        return (
          <div key={el.id} style={{...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)`, borderColor: borderColors[themeColor] || '#a855f7', backgroundColor: bgColors[themeColor] || 'rgba(168,85,247,0.1)' }} className="p-4 border-[2px] border-solid shadow-md rounded-xl flex flex-col pointer-events-none">
             <div className="flex items-center justify-between mb-3 border-b-2 pb-2" style={{ borderColor: borderColors[themeColor] || '#a855f7' }}>
                <div className="flex items-center gap-2" style={{ color: borderColors[themeColor] || '#a855f7' }}><h3 className="font-bold tracking-widest text-xs uppercase">{el.name}</h3></div>
             </div>
          </div>
        );
      }
      
      const isHovered = hoveredSlotId === el.id;

      // Base Z and effect styles for slots
      const slotZ = 5;
      const slotTransition = 'all 0.2s ease-in-out';

      if (el.type === 'slot') {
        const bgColor = isHovered ? '#67e8f9' : '#ffffff'; // cyan-300 : white
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor: isHovered ? '#06b6d4' : '#94a3b8', backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedSlot({ id: el.name || el.id, type: 'hourly' });
               }}>
            <span className="text-[10px] font-bold text-slate-500 mb-1 group-hover:text-[#0891b2]" style={{ transform: 'translateZ(2px)' }}>{el.name || el.id}</span>
            <Car size={20} className="text-slate-400 group-hover:text-[#06b6d4]" style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-ev') {
        const bgColor = isHovered ? '#6ee7b7' : '#ecfdf5'; // emerald-300 : emerald-50
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor: isHovered ? '#059669' : '#10b981', backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedSlot({ id: el.name || el.id, type: 'ev' });
               }}>
            <span className="text-[10px] font-bold text-emerald-600 mb-1" style={{ transform: 'translateZ(2px)' }}>{el.name || 'EV'}</span>
            <Zap size={20} className="text-emerald-500" style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-handicap') {
        const bgColor = isHovered ? '#93c5fd' : '#eff6ff'; // blue-300 : blue-50
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor: isHovered ? '#2563eb' : '#3b82f6', backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedSlot({ id: el.name || el.id, type: 'handicap' });
               }}>
            <span className="text-[10px] font-bold text-blue-600 mb-1" style={{ transform: 'translateZ(2px)' }}>{el.name || '♿'}</span>
            <Accessibility size={20} className="text-blue-500" style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-moto') {
        const bgColor = isHovered ? '#fcd34d' : '#fffbeb'; // amber-300 : amber-50
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor: isHovered ? '#d97706' : '#f59e0b', backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedSlot({ id: el.name || el.id, type: 'moto' });
               }}>
            <span className="text-[8px] font-bold text-amber-600 mb-1" style={{ transform: 'translateZ(2px)' }}>{el.name || 'MOTO'}</span>
            <Bike size={16} className="text-amber-500" style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'gate') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(10px) rotateZ(${el.rot || 0}deg)`, borderColor: '#22c55e', backgroundColor: '#dcfce7', color: '#15803d' }} className="flex items-center justify-center text-xs font-black rounded border-[2px] border-solid shadow-md tracking-wider">
             {el.name || 'GATE'}
           </div>
         );
      }

      if (el.type === 'planter') {
        return (
          <div key={el.id} style={{...style, transform: `translateZ(15px) rotateZ(${el.rot || 0}deg)`, borderColor: '#34d399', backgroundColor: '#d1fae5' }} className="flex flex-col items-center justify-evenly border-[2px] border-solid rounded-full shadow-md">
            <TreePine size={18} className="text-[#059669]" style={{ transform: 'translateZ(10px)' }} />
            <TreePine size={18} className="text-[#059669]" style={{ transform: 'translateZ(15px)' }} />
          </div>
        );
      }

      if (el.type === 'wall') {
        return (
          <div key={el.id} style={{...style, transform: `translateZ(15px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#475569', borderColor: '#334155'}} className="border-[2px] border-solid shadow-md flex items-center justify-center overflow-hidden rounded">
             <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' }}></div>
          </div>
        );
      }

      if (el.type === 'road') {
        return (
          <div key={el.id} style={{...style, transform: `translateZ(1px) rotateZ(${el.rot || 0}deg)`}} className="flex items-center justify-center opacity-60 pointer-events-none">
             <div className="text-[#f59e0b] font-black tracking-widest text-xl flex items-center gap-2 drop-shadow-md">
                <ArrowRight size={32} />
                <span className="uppercase">{el.name}</span>
             </div>
          </div>
        );
      }
      
      if (el.type === 'bump') {
        return (
          <div key={el.id} style={{...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)`}} className="flex items-center justify-center rounded overflow-hidden shadow-sm">
             <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, #000 10px, #000 20px)' }}></div>
          </div>
        );
      }

      if (el.type === 'pillar') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(40px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#cbd5e1', borderColor: '#94a3b8'}} className="border-[2px] border-solid shadow-2xl flex items-center justify-center text-[10px] font-bold text-slate-600 rounded-sm">
             {el.name}
           </div>
         );
      }

      if (el.type === 'sign') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(30px) rotateZ(${el.rot || 0}deg)`}} className="flex flex-col items-center justify-center">
             <div className="w-full h-full bg-[#ef4444] rounded-full border-[3px] border-white flex items-center justify-center shadow-lg text-white font-black text-[10px] text-center p-1 leading-tight z-10">
                {el.name}
             </div>
             <div className="w-1 h-8 bg-slate-400 absolute -bottom-6 z-0"></div>
           </div>
         );
      }
      
      if (el.type === 'ramp') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(5px) rotateZ(${el.rot || 0}deg)`, backgroundImage: 'linear-gradient(to top, #94a3b8, #cbd5e1)'}} className="border-[2px] border-[#64748b] border-solid shadow-md flex items-center justify-center text-xs font-bold text-slate-700 rounded-sm overflow-hidden">
             <div className="flex flex-col items-center gap-2">
                <Navigation size={24} className="text-slate-600" />
                <span>{el.name}</span>
             </div>
           </div>
         );
      }
      
      if (el.type === 'elevator') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(50px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#f8fafc', borderColor: '#cbd5e1'}} className="border-[4px] border-double shadow-2xl flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 rounded">
             <Layers size={24} className="text-slate-400 mb-1" />
             {el.name}
           </div>
         );
      }
      
      if (el.type === 'kiosk') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(20px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#1e293b', borderColor: '#0ea5e9'}} className="border-[2px] border-solid shadow-xl flex flex-col items-center justify-center text-[8px] font-bold text-sky-400 rounded-sm">
             <MonitorSmartphone size={16} className="text-sky-400 mb-1" />
             {el.name}
           </div>
         );
      }
      
      if (el.type === 'group') {
         return (
           <div key={el.id} style={{...style, transform: `translateZ(0px) rotateZ(${el.rot || 0}deg)`, transformStyle: 'preserve-3d'}} className="pointer-events-none">
             {el.children && renderDynamicElements(el.children)}
           </div>
         );
      }
      
      return null;
    });
  };

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

      <div className="absolute top-4 right-8 z-50 text-white/40 text-xs text-right pointer-events-none">
        <p><strong>Left Click + Drag</strong>: Orbit 3D Space</p>
        <p><strong>Shift + Drag / Right Click</strong>: Pan</p>
        <p><strong>Mouse Wheel</strong>: Zoom</p>
      </div>

      {/* Main Map Container for Orbit Controls */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .glass-panel { background: rgba(24, 28, 35, 0.4); backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; }
          .slot-card { border-width: 1px; border-style: solid; border-radius: 0.5rem; transition: all 0.2s; }
          .planter { display: flex; align-items: center; justify-content: space-evenly; }
          .scene-container { perspective: 2000px; }
          .scene-world { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
          .floor-plane { transform-style: preserve-3d; transition: filter 0.3s; }
        `}} />

        {/* 3D SCENE ROOT */}
        <div 
          className="absolute top-1/2 left-1/2" 
          style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
        >
          {/* CAMERA TRANSFORMER */}
          <div 
             style={{
                transformStyle: 'preserve-3d',
                transform: `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom}) rotateX(${camera.rotX}deg) rotateZ(${camera.rotZ}deg)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
             }}
          >
            {loading ? (
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-bold text-xl">Loading layout...</div>
            ) : (
              <>
                {/* RENDER STACKED FLOORS */}
                {floors.map((floor, idx) => {
                  const currentFloorIndex = currentFloorId ? floors.findIndex(f => f._id === currentFloorId) : -1;
                  const isOverview = currentFloorIndex === -1;
                  const isCurrent = idx === currentFloorIndex;
                  const isAbove = !isOverview && idx > currentFloorIndex;
                  const isBelow = !isOverview && idx < currentFloorIndex;
                  
                  let targetZ;
                  let targetOpacity = 1;
                  let pointerEvents = 'auto'; // Default allow clicking

                  if (isOverview) {
                      // Center the entire building stack
                      const centerIndex = (floors.length - 1) / 2;
                      targetZ = (idx - centerIndex) * 300;
                  } else {
                      // We shift all floors so that the currentFloor is ALWAYS at Z=0 (focal point).
                      targetZ = (idx - currentFloorIndex) * 300;
                      if (isAbove) {
                          // Floors above fly up into the sky and fade out
                          targetZ += 1200;
                          targetOpacity = 0;
                          pointerEvents = 'none';
                      } else if (isBelow) {
                          // Floors below just dim out
                          targetOpacity = 0.2;
                      }
                  }
                  
                  return (
                    <div 
                      key={floor._id}
                      className="absolute floor-plane group"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `translate(-50%, -50%) translateZ(${targetZ}px)`,
                        width: floor.layoutData?.width || 1000,
                        height: floor.layoutData?.height || 600,
                        backgroundColor: isCurrent ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                        border: isCurrent ? '2px solid rgba(6,182,212,0.8)' : '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '2rem',
                        boxShadow: isCurrent ? '0 0 50px rgba(6,182,212,0.2)' : '0 0 30px rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(8px)',
                        opacity: targetOpacity,
                        pointerEvents: pointerEvents,
                        transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.2s ease, background-color 1s ease'
                      }}
                      onClick={(e) => {
                         if (e.target === e.currentTarget) {
                            setCurrentFloorId(floor._id);
                         }
                      }}
                    >
                      {/* Floor Name Tag */}
                      <div className="absolute -top-12 left-10 text-cyan-400/80 font-black text-3xl tracking-widest uppercase drop-shadow-xl transition-all duration-1000" 
                           style={{ transform: 'translateZ(20px)', opacity: isCurrent ? 1 : 0.5 }}>
                        {floor.name} {isCurrent && <span className="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full ml-4">SELECTED</span>}
                      </div>
                      
                      {/* Grid overlay for aesthetic */}
                      <div className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-20"
                           style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

                      {/* User Defined Elements from JSON */}
                      {renderDynamicElements(floor.layoutData?.elements)}
                      
                      {/* Fallback instruction if empty */}
                      {floor.layoutData?.elements?.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/30 font-bold text-xl tracking-widest uppercase pointer-events-none">
                          <p>Empty Layout</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Floating Zoom UI Reset */}
        <div className="absolute bottom-14 right-8 flex flex-row gap-2 z-50">
          <button onClick={() => setCamera({ rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 })} className="p-3 bg-[#181c23]/80 hover:bg-white/10 backdrop-blur border border-white/10 rounded-xl text-white shadow-xl transition-all"><Maximize size={20} /></button>
        </div>
      </div>

      {/* Slide-over panel for slots */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedSlot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setSelectedSlot(null)}></div>
      <div className={`absolute top-0 right-0 bottom-0 w-[420px] bg-[#0f172a]/80 backdrop-blur-2xl border-l border-cyan-500/20 p-8 flex flex-col shadow-[-20px_0_50px_rgba(8,145,178,0.1)] text-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${selectedSlot ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedSlot && (
           <>
              <div className="flex justify-between items-start mb-8">
                <div>
                    <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-1 block">{selectedSlot.type} Ticket</span>
                    <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
                        SLOT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{selectedSlot.id}</span>
                    </h2>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 w-8 h-8 rounded-full flex items-center justify-center transition-all border border-white/5">
                    <X size={16} strokeWidth={2} />
                </button>
            </div>
            {/* Some mock info just for display */}
            <div className="mb-8">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Customer Info</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">License Plate</span><span className="font-mono text-base font-semibold text-white bg-slate-800/80 px-3 py-1 rounded border border-slate-700/50">{selectedSlot.plate}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Owner</span><span className="font-medium text-white">{selectedSlot.owner}</span></div>
                </div>
            </div>
           </>
        )}
      </div>

    </div>
  );
}
