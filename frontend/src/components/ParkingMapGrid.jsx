import React, { useState, useRef, useEffect } from "react";
import { Car, Zap, ZoomIn, ZoomOut, Maximize, TreePine, ArrowRight, Accessibility, Bike, Navigation, Layers, MonitorSmartphone } from "lucide-react";

export default function ParkingMapGrid({ 
  floors = [], 
  currentFloorId = null, 
  onFloorSelect, 
  onSlotClick,
  activeSessions = [], // Array of sessions to determine slot status
  loading = false,
  isEditMode = false // In case we want to reuse something, but currently builder is separated
}) {
  const [camera, setCamera] = useState({ rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 });
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const handleWheelNative = (e) => {
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
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    let action = 'orbit';
    if (e.button === 2 || e.button === 1 || e.shiftKey) {
      action = 'pan';
    }
    setDragStart({ x: e.clientX, y: e.clientY, action, startCamera: { ...camera } });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (dragStart.action === 'orbit') {
      setCamera({
        ...dragStart.startCamera,
        rotZ: dragStart.startCamera.rotZ + deltaX * 0.5,
        rotX: Math.max(0, Math.min(90, dragStart.startCamera.rotX - deltaY * 0.5))
      });
    } else if (dragStart.action === 'pan') {
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

  const handleContextMenu = (e) => e.preventDefault();

  const getSlotSession = (slotName) => {
    return activeSessions.find(s => s.parkingSlot === slotName);
  };

  const renderDynamicElements = (elements) => {
    if (!elements) return null;
    return elements.map(el => {
      const style = {
        position: 'absolute',
        left: `${el.x}px`,
        top: `${el.y}px`,
        width: `${el.w}px`,
        height: `${el.h}px`,
        transform: `translateZ(1px) rotateZ(${el.rot || 0}deg)`,
        transformStyle: 'preserve-3d'
      };

      if (el.type === 'zone') {
        const themeColor = el.color || 'purple';
        const borderColors = { purple: '#a855f7', emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b' };
        const bgColors = { purple: 'rgba(168,85,247,0.1)', emerald: 'rgba(16,185,129,0.1)', blue: 'rgba(59,130,246,0.1)', amber: 'rgba(245,158,11,0.1)' };
        
        return (
          <div key={el.id} style={{...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)`, borderColor: borderColors[themeColor] || '#a855f7', backgroundColor: bgColors[themeColor] || 'rgba(168,85,247,0.1)' }} className="border-[2px] border-solid shadow-md rounded-xl pointer-events-none">
             <div className="absolute -top-4 left-4 px-3 py-1 bg-white border-[2px] border-solid rounded-full shadow-md flex items-center justify-center" style={{ borderColor: borderColors[themeColor] || '#a855f7', transform: 'translateZ(10px)' }}>
                <span className="font-black tracking-widest text-[10px] uppercase leading-none" style={{ color: borderColors[themeColor] || '#a855f7' }}>{el.name}</span>
             </div>
          </div>
        );
      }
      
      const isHovered = hoveredSlotId === el.id;
      const slotZ = 5;
      const slotTransition = 'all 0.2s ease-in-out';
      
      // Determine if slot is occupied
      const session = getSlotSession(el.name || el.id);
      const isOccupied = !!session;

      const handleClick = (e, type) => {
        e.stopPropagation();
        if (onSlotClick) {
          onSlotClick({ id: el.name || el.id, type, session });
        }
      };

      if (el.type === 'slot') {
        let bgColor = '#ffffff';
        let borderColor = '#94a3b8';
        if (isOccupied) { bgColor = '#fecdd3'; borderColor = '#e11d48'; } // red-200 : rose-600
        else if (isHovered) { bgColor = '#67e8f9'; borderColor = '#06b6d4'; }

        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor, backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => handleClick(e, 'hourly')}>
            <span className={`text-[10px] font-bold mb-1 ${isOccupied ? 'text-rose-700' : 'text-slate-500 group-hover:text-[#0891b2]'}`} style={{ transform: 'translateZ(2px)' }}>
              {isOccupied ? session.licensePlate : (el.name || el.id)}
            </span>
            <Car size={20} className={isOccupied ? 'text-rose-500' : 'text-slate-400 group-hover:text-[#06b6d4]'} style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-ev') {
        let bgColor = '#ecfdf5';
        let borderColor = '#10b981';
        if (isOccupied) { bgColor = '#fecdd3'; borderColor = '#e11d48'; }
        else if (isHovered) { bgColor = '#6ee7b7'; borderColor = '#059669'; }
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor, backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => handleClick(e, 'ev')}>
            <span className={`text-[10px] font-bold mb-1 ${isOccupied ? 'text-rose-700' : 'text-emerald-600'}`} style={{ transform: 'translateZ(2px)' }}>
              {isOccupied ? session.licensePlate : (el.name || 'EV')}
            </span>
            <Zap size={20} className={isOccupied ? 'text-rose-500' : 'text-emerald-500'} style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-handicap') {
        let bgColor = '#eff6ff';
        let borderColor = '#3b82f6';
        if (isOccupied) { bgColor = '#fecdd3'; borderColor = '#e11d48'; }
        else if (isHovered) { bgColor = '#93c5fd'; borderColor = '#2563eb'; }
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor, backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => handleClick(e, 'handicap')}>
            <span className={`text-[10px] font-bold mb-1 ${isOccupied ? 'text-rose-700' : 'text-blue-600'}`} style={{ transform: 'translateZ(2px)' }}>
              {isOccupied ? session.licensePlate : (el.name || '♿')}
            </span>
            <Accessibility size={20} className={isOccupied ? 'text-rose-500' : 'text-blue-500'} style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      if (el.type === 'slot-moto') {
        let bgColor = '#fffbeb';
        let borderColor = '#f59e0b';
        if (isOccupied) { bgColor = '#fecdd3'; borderColor = '#e11d48'; }
        else if (isHovered) { bgColor = '#fcd34d'; borderColor = '#d97706'; }
        return (
          <div key={el.id} style={{...style, transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`, borderColor, backgroundColor: bgColor, transition: slotTransition }} className="border-[2px] border-solid rounded-lg cursor-pointer shadow-sm flex flex-col items-center justify-center group"
               onMouseEnter={() => setHoveredSlotId(el.id)}
               onMouseLeave={() => setHoveredSlotId(null)}
               onClick={(e) => handleClick(e, 'moto')}>
            <span className={`text-[8px] font-bold mb-1 ${isOccupied ? 'text-rose-700' : 'text-amber-600'}`} style={{ transform: 'translateZ(2px)' }}>
              {isOccupied ? session.licensePlate : (el.name || 'MOTO')}
            </span>
            <Bike size={16} className={isOccupied ? 'text-rose-500' : 'text-amber-500'} style={{ transform: 'translateZ(5px)' }} />
          </div>
        );
      }

      // Other static elements (gate, planter, wall, road, etc)
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
    <>
      <div className="absolute top-4 right-8 z-50 text-white/40 text-xs text-right pointer-events-none">
        <p><strong>Left Click + Drag</strong>: Orbit 3D Space</p>
        <p><strong>Shift + Drag / Right Click</strong>: Pan</p>
        <p><strong>Mouse Wheel</strong>: Zoom</p>
      </div>

      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} w-full h-full`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .floor-plane { transform-style: preserve-3d; transition: filter 0.3s; }
        `}} />

        <div className="absolute top-1/2 left-1/2" style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}>
          <div style={{
            transformStyle: 'preserve-3d',
            transform: `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom}) rotateX(${camera.rotX}deg) rotateZ(${camera.rotZ}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}>
            {loading ? (
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-bold text-xl">Loading layout...</div>
            ) : (
              <>
                {floors.map((floor, idx) => {
                  const currentFloorIndex = currentFloorId ? floors.findIndex(f => f._id === currentFloorId) : -1;
                  const isOverview = currentFloorIndex === -1;
                  const isCurrent = idx === currentFloorIndex;
                  const isAbove = !isOverview && idx > currentFloorIndex;
                  const isBelow = !isOverview && idx < currentFloorIndex;
                  
                  let targetZ;
                  let targetOpacity = 1;
                  let pointerEvents = 'auto';

                  if (isOverview) {
                      const centerIndex = (floors.length - 1) / 2;
                      targetZ = (idx - centerIndex) * 300;
                  } else {
                      targetZ = (idx - currentFloorIndex) * 300;
                      if (isAbove) {
                          targetZ += 1200;
                          targetOpacity = 0;
                          pointerEvents = 'none';
                      } else if (isBelow) {
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
                         if (!isCurrent && onFloorSelect) {
                            e.stopPropagation();
                            onFloorSelect(floor._id);
                         } else if (e.target === e.currentTarget && onFloorSelect) {
                            onFloorSelect(floor._id);
                         }
                      }}
                    >
                      <div className="absolute -top-12 left-10 text-cyan-400/80 font-black text-3xl tracking-widest uppercase drop-shadow-xl transition-all duration-1000 pointer-events-none" 
                           style={{ transform: 'translateZ(20px)', opacity: isCurrent ? 1 : 0.5 }}>
                        {floor.name} {isCurrent && <span className="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full ml-4">SELECTED</span>}
                      </div>
                      
                      <div className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-20"
                           style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

                      <div className="absolute inset-0" style={{ pointerEvents: !isCurrent ? 'none' : 'auto', transformStyle: 'preserve-3d' }}>
                        {renderDynamicElements(floor.layoutData?.elements)}
                      </div>
                      
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

        <div className="absolute bottom-14 right-8 flex flex-row gap-2 z-50">
          <button onClick={() => setCamera({ rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 })} className="p-3 bg-[#181c23]/80 hover:bg-white/10 backdrop-blur border border-white/10 rounded-xl text-white shadow-xl transition-all"><Maximize size={20} /></button>
        </div>
      </div>
    </>
  );
}
