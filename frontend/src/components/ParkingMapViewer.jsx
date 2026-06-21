import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Maximize, Car, Zap, Accessibility, Bike, Info, TreePine, ArrowRight, Navigation, Layers, MonitorSmartphone } from 'lucide-react';

const SlotElement = React.memo(({ el, floorId, style, isOccupied, isSelected, isMaintenance, session, onSelectSlot, is2DMode }) => {
  const slotName = el.name || el.id;
  const hasName = !!el.name && el.name.trim() !== '';
  const slotZ = isSelected ? 15 : 5;
  const slotTransition = 'all 0.2s ease-in-out';

  let baseBgColor = '#ffffff';
  let baseBorderColor = '#94a3b8';
  let textColor = '#64748b';
  let Icon = Car;

  if (el.type === 'slot-ev') { baseBgColor = '#ecfdf5'; baseBorderColor = '#10b981'; textColor = '#10b981'; Icon = Zap; }
  if (el.type === 'slot-handicap') { baseBgColor = '#eff6ff'; baseBorderColor = '#3b82f6'; textColor = '#3b82f6'; Icon = Accessibility; }
  if (el.type === 'slot-moto') { baseBgColor = '#fffbeb'; baseBorderColor = '#f59e0b'; textColor = '#f59e0b'; Icon = Bike; }

  let finalBgColor = baseBgColor;
  let finalBorderColor = baseBorderColor;

  const maintenanceStyle = isMaintenance ? {
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 10px, rgba(127, 29, 29, 0.3) 10px, rgba(127, 29, 29, 0.3) 20px)'
  } : {};

  if (isMaintenance) {
    finalBgColor = '#fee2e2'; // red-100
    finalBorderColor = '#ef4444'; // red-500
    textColor = '#b91c1c'; // red-700
  } else if (isOccupied) {
    finalBgColor = '#fee2e2'; // red-100
    finalBorderColor = '#ef4444'; // red-500
    textColor = '#ef4444';
  } else if (isSelected) {
    finalBgColor = '#cffafe'; // cyan-100
    finalBorderColor = '#06b6d4'; // cyan-500
    textColor = '#06b6d4';
  }

  return (
    <div
      style={{
        ...style,
        ...maintenanceStyle,
        transform: `translateZ(${slotZ}px) rotateZ(${el.rot || 0}deg)`,
        borderColor: finalBorderColor,
        backgroundColor: finalBgColor,
        transition: slotTransition,
        cursor: (isOccupied || isMaintenance || !el.name || el.name.trim() === '') ? 'not-allowed' : 'pointer',
        opacity: (!el.name || el.name.trim() === '') ? 0.3 : 1
      }}
      className={`border-[2px] border-solid rounded-lg shadow-sm flex flex-col items-center justify-center ${isSelected ? 'ring-4 ring-cyan-500/50 shadow-cyan-500/50' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!el.name || el.name.trim() === '') return;
        if (!isOccupied && !isMaintenance && onSelectSlot) {
          onSelectSlot({ id: slotName, type: el.type }, floorId);
        }
      }}>
      <span className="text-[10px] font-bold mb-1" style={{ color: textColor, transform: 'translateZ(2px)' }}>{hasName ? el.name : ''}</span>
      <Icon size={20} style={{ color: textColor, transform: 'translateZ(5px)' }} />
    </div>
  );
});

export default function ParkingMapViewer({ floors, currentFloorId, onFloorSelect, activeSessions = [], dbSlots = [], onSelectSlot, selectedSlotId, is2DMode = false, hideUI = false }) {
  const [camera, setCamera] = useState(
    is2DMode
      ? { rotX: 0, rotZ: 0, panX: 0, panY: 0, zoom: 0.55 }
      : { rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const containerRef = useRef(null);

  // O(1) Lookup Map for Active Sessions
  const sessionMap = useMemo(() => {
    return activeSessions.reduce((acc, curr) => {
      acc[`${curr.floorId}-${curr.parkingSlot}`] = curr;
      return acc;
    }, {});
  }, [activeSessions]);

  const dbSlotMap = useMemo(() => {
    return dbSlots.reduce((acc, curr) => {
      acc[`${curr.floorID}-${curr.slotNumber}`] = curr;
      return acc;
    }, {});
  }, [dbSlots]);

  const handleSelectSlot = useCallback((slot, floorId) => {
    if (onSelectSlot) {
      onSelectSlot(slot, floorId);
    }
  }, [onSelectSlot]);

  // --- MOUSE CONTROLS ---
  const handleMouseDown = (e) => {
    if (is2DMode) return; // Completely disable dragging in 2D mode
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

    if (dragStart.action === 'orbit' && !is2DMode) {
      setCamera({
        ...dragStart.startCamera,
        rotZ: dragStart.startCamera.rotZ + deltaX * 0.5,
        rotX: Math.max(0, Math.min(90, dragStart.startCamera.rotX - deltaY * 0.5))
      });
    } else if (dragStart.action === 'pan' || (dragStart.action === 'orbit' && is2DMode)) {
      // In 2D mode, all drag is pan
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

  const renderDynamicElements = (elements, floorId) => {
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
          <div key={el.id} style={{ ...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)`, borderColor: borderColors[themeColor] || '#a855f7', backgroundColor: bgColors[themeColor] || 'rgba(168,85,247,0.1)' }} className="p-4 border-[2px] border-solid shadow-md rounded-xl flex flex-col pointer-events-none">
            {el.name && el.name.trim() !== '' && (
              <div className="flex items-center justify-between mb-3 border-b-2 pb-2" style={{ borderColor: borderColors[themeColor] || '#a855f7' }}>
                <div className="flex items-center gap-2" style={{ color: borderColors[themeColor] || '#a855f7' }}><h3 className="font-bold tracking-widest text-xs uppercase">{el.name}</h3></div>
              </div>
            )}
          </div>
        );
      }

      // SLOT LOGIC
      if (el.type && el.type.startsWith('slot')) {
        const slotName = el.name || el.id;
        const sessionKey = `${floorId}-${slotName}`;
        const occupiedSession = sessionMap[sessionKey];
        const isOccupied = !!occupiedSession;
        const isSelected = selectedSlotId === slotName;
        const dbSlot = dbSlotMap[`${floorId}-${slotName}`];
        const isMaintenance = dbSlot?.status === 'maintenance';

        return (
          <SlotElement
            key={el.id}
            el={el}
            floorId={floorId}
            style={style}
            isOccupied={isOccupied}
            isSelected={isSelected}
            isMaintenance={isMaintenance}
            session={occupiedSession}
            onSelectSlot={handleSelectSlot}
            is2DMode={is2DMode}
          />
        );
      }

      // OTHER ELEMENTS
      if (el.type === 'wall') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(15px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#475569', borderColor: '#334155' }} className="border-[2px] border-solid shadow-md flex items-center justify-center overflow-hidden rounded pointer-events-none">
            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' }}></div>
          </div>
        );
      }

      if (el.type === 'door' || el.type === 'entry') {
        return <div key={el.id} style={{ ...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)` }} className="bg-emerald-400/20 backdrop-blur border border-emerald-400/50 rounded-sm flex items-center justify-center text-[8px] font-bold text-emerald-400 tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.3)] pointer-events-none">ENTRANCE</div>;
      }
      if (el.type === 'exit') {
        return <div key={el.id} style={{ ...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)` }} className="bg-red-400/20 backdrop-blur border border-red-400/50 rounded-sm flex items-center justify-center text-[8px] font-bold text-red-400 tracking-widest shadow-[0_0_15px_rgba(248,113,113,0.3)] pointer-events-none">EXIT</div>;
      }
      if (el.type === 'gate') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(10px) rotateZ(${el.rot || 0}deg)`, borderColor: '#22c55e', backgroundColor: '#dcfce7', color: '#15803d' }} className="flex items-center justify-center text-xs font-black rounded border-[2px] border-solid shadow-md tracking-wider pointer-events-none">
            {el.name || 'GATE'}
          </div>
        );
      }

      if (el.type === 'ramp-up') {
        return <div key={el.id} style={{ ...style, transform: `translateZ(5px) rotateZ(${el.rot || 0}deg)` }} className="bg-slate-300 border border-slate-400 rounded-sm flex flex-col items-center justify-center text-slate-600 pointer-events-none"><div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[15px] border-transparent border-b-slate-500 mb-1"></div><span className="text-[10px] font-bold tracking-widest">RAMP UP</span></div>;
      }
      if (el.type === 'ramp-down') {
        return <div key={el.id} style={{ ...style, transform: `translateZ(5px) rotateZ(${el.rot || 0}deg)` }} className="bg-slate-300 border border-slate-400 rounded-sm flex flex-col items-center justify-center text-slate-600 pointer-events-none"><span className="text-[10px] font-bold tracking-widest mb-1">RAMP DOWN</span><div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[15px] border-transparent border-t-slate-500"></div></div>;
      }
      if (el.type === 'ramp') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(5px) rotateZ(${el.rot || 0}deg)`, backgroundImage: 'linear-gradient(to top, #94a3b8, #cbd5e1)' }} className="border-[2px] border-[#64748b] border-solid shadow-md flex items-center justify-center text-xs font-bold text-slate-700 rounded-sm overflow-hidden pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Navigation size={24} className="text-slate-600" />
              <span>{el.name}</span>
            </div>
          </div>
        );
      }

      if (el.type === 'planter') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(15px) rotateZ(${el.rot || 0}deg)`, borderColor: '#34d399', backgroundColor: '#d1fae5' }} className="flex flex-col items-center justify-evenly border-[2px] border-solid rounded-full shadow-md pointer-events-none">
            <TreePine size={18} className="text-[#059669]" style={{ transform: 'translateZ(10px)' }} />
            <TreePine size={18} className="text-[#059669]" style={{ transform: 'translateZ(15px)' }} />
          </div>
        );
      }

      if (el.type === 'road') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(1px) rotateZ(${el.rot || 0}deg)` }} className="flex items-center justify-center opacity-60 pointer-events-none">
            <div className="text-[#f59e0b] font-black tracking-widest text-xl flex items-center gap-2 drop-shadow-md">
              <ArrowRight size={32} />
              <span className="uppercase">{el.name}</span>
            </div>
          </div>
        );
      }

      if (el.type === 'bump') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(2px) rotateZ(${el.rot || 0}deg)` }} className="flex items-center justify-center rounded overflow-hidden shadow-sm pointer-events-none">
            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, #000 10px, #000 20px)' }}></div>
          </div>
        );
      }

      if (el.type === 'pillar') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(40px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#cbd5e1', borderColor: '#94a3b8' }} className="border-[2px] border-solid shadow-2xl flex items-center justify-center text-[10px] font-bold text-slate-600 rounded-sm pointer-events-none">
            {el.name}
          </div>
        );
      }

      if (el.type === 'sign') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(30px) rotateZ(${el.rot || 0}deg)` }} className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-full h-full bg-[#ef4444] rounded-full border-[3px] border-white flex items-center justify-center shadow-lg text-white font-black text-[10px] text-center p-1 leading-tight z-10">
              {el.name}
            </div>
            <div className="w-1 h-8 bg-slate-400 absolute -bottom-6 z-0"></div>
          </div>
        );
      }

      if (el.type === 'elevator') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(50px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }} className="border-[4px] border-double shadow-2xl flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 rounded pointer-events-none">
            <Layers size={24} className="text-slate-400 mb-1" />
            {el.name}
          </div>
        );
      }

      if (el.type === 'kiosk') {
        return (
          <div key={el.id} style={{ ...style, transform: `translateZ(20px) rotateZ(${el.rot || 0}deg)`, backgroundColor: '#1e293b', borderColor: '#0ea5e9' }} className="border-[2px] border-solid shadow-xl flex flex-col items-center justify-center text-[8px] font-bold text-sky-400 rounded-sm pointer-events-none">
            <MonitorSmartphone size={16} className="text-sky-400 mb-1" />
            {el.name}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0b0e16]"
      style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '30px 30px' }}>

      {/* Floor Selector */}
      {!hideUI && floors && floors.length > 0 && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-4 bg-[#181c23]/80 backdrop-blur border border-white/10 p-2 rounded-xl shadow-lg">
          <select
            className="bg-black/40 border border-white/20 rounded p-2 text-white text-sm outline-none font-bold min-w-[120px]"
            value={currentFloorId || ""}
            onChange={(e) => onFloorSelect && onFloorSelect(e.target.value === "" ? null : e.target.value)}
          >
            <option value="">-- Building Overview --</option>
            {floors.map(f => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Legend */}
      {!hideUI && (
        <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 bg-[#181c23]/80 backdrop-blur border border-white/10 p-4 rounded-xl shadow-lg text-xs text-white">
          <h4 className="font-bold mb-2 text-cyan-400">Status Legend</h4>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-white border-2 border-slate-400"></div> Available</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border-2 border-red-500"></div> Occupied</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-cyan-100 border-2 border-cyan-500"></div> Selected</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-200 border-2 border-red-500" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 4px, rgba(127, 29, 29, 0.3) 4px, rgba(127, 29, 29, 0.3) 8px)' }}></div> Maintenance</div>
        </div>
      )}

      {!hideUI && !is2DMode && (
        <div className="absolute top-4 right-4 z-50 text-white/40 text-[10px] text-right pointer-events-none">
          <p><strong>Left Click + Drag</strong>: Orbit</p>
          <p><strong>Right Click + Drag</strong>: Pan</p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full h-full p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          .scene-container { perspective: 2000px; }
          .scene-world { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
          .floor-plane { transform-style: preserve-3d; transition: filter 0.3s; }
        `}} />

        <div className="absolute top-1/2 left-1/2" style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}>
          <div style={{
            transformStyle: 'preserve-3d',
            transform: `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom}) rotateX(${camera.rotX}deg) rotateZ(${camera.rotZ}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          >
            {floors && floors.length > 0 && floors.map((floor, idx) => {
              const currentFloorIndex = currentFloorId ? floors.findIndex(f => f._id === currentFloorId) : -1;
              const isOverview = currentFloorIndex === -1;
              const isCurrent = idx === currentFloorIndex;
              const isAbove = !isOverview && idx > currentFloorIndex;
              const isBelow = !isOverview && idx < currentFloorIndex;

              let targetZ;
              let targetOpacity = 1;
              let pointerEvents = 'auto';

              if (is2DMode) {
                if (isOverview) {
                  targetZ = -800;
                  targetOpacity = 0;
                  pointerEvents = 'none';
                } else {
                  if (isAbove) {
                    targetZ = 800; // Tầng trên: bay về phía camera (Zoom in) & mờ đi
                    targetOpacity = 0;
                    pointerEvents = 'none';
                  } else if (isBelow) {
                    targetZ = -800; // Tầng dưới: bay ra xa camera (Zoom out) & mờ đi
                    targetOpacity = 0;
                    pointerEvents = 'none';
                  } else {
                    targetZ = 0; // Tầng hiện tại: ở giữa
                  }
                }
              } else {
                if (isOverview) {
                  const centerIndex = (floors.length - 1) / 2;
                  targetZ = (idx - centerIndex) * 200;
                } else {
                  targetZ = (idx - currentFloorIndex) * 150;
                  if (isAbove) { 
                    targetZ += 500; 
                    targetOpacity = 0; 
                    pointerEvents = 'none'; 
                  }
                  else if (isBelow) { targetOpacity = 0.2; }
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
                    backgroundColor: isCurrent || isOverview ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                    border: is2DMode ? 'none' : (isCurrent ? '2px solid rgba(6,182,212,0.8)' : '1px solid rgba(255,255,255,0.5)'),
                    borderRadius: '2rem',
                    boxShadow: is2DMode ? 'none' : (isCurrent ? '0 0 50px rgba(6,182,212,0.2)' : '0 0 30px rgba(0,0,0,0.2)'),
                    backdropFilter: is2DMode ? 'none' : 'blur(8px)',
                    opacity: targetOpacity,
                    pointerEvents: pointerEvents,
                    transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.2s ease, background-color 1s ease'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && onFloorSelect) {
                      onFloorSelect(floor._id);
                    }
                  }}
                >
                  <div className="absolute -top-12 left-10 text-cyan-400/80 font-black text-3xl tracking-widest uppercase drop-shadow-xl transition-all duration-1000"
                    style={{ transform: 'translateZ(20px)', opacity: isCurrent || isOverview ? 1 : 0.5 }}>
                    {floor.name}
                  </div>
                  <div className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-20"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                  {renderDynamicElements(floor.layoutData?.elements, floor._id)}
                </div>
              );
            })}
          </div>
        </div>

        {!hideUI && (
          <div className="absolute bottom-4 right-4 z-50">
            <button onClick={() => setCamera(is2DMode ? { rotX: 0, rotZ: 0, panX: 0, panY: 0, zoom: 0.55 } : { rotX: 60, rotZ: -30, panX: 0, panY: 0, zoom: 0.7 })} className="p-3 bg-[#181c23]/80 hover:bg-white/10 backdrop-blur border border-white/10 rounded-xl text-white shadow-xl transition-all"><Maximize size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
