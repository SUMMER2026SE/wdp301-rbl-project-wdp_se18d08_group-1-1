import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { Save, Plus, X, Box, Type, Minus, ArrowRight, Square, AlertCircle, Zap, Accessibility, Bike, Navigation, Layers, MonitorSmartphone, TreePine, Car } from "lucide-react";

export default function ParkingLotsBuilder({ floor, onSave, onCancel }) {
  const [elements, setElements] = useState(floor?.layoutData?.elements || []);
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [activeCategory, setActiveCategory] = useState("spaces");
  
  // Canvas Pan & Zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const clipboardRef = useRef(null);
  
  // Sidebar Resizing State
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(288); // 72 * 4
  const [rightSidebarWidth, setRightSidebarWidth] = useState(288);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  // Smart Guides State
  const [guides, setGuides] = useState([]);

  // Undo/Redo State
  const [historyState, setHistoryState] = useState({
    history: [floor?.layoutData?.elements || []],
    index: 0
  });
  const isUndoRedoRef = useRef(false);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    setHistoryState(prev => {
      const newHistory = prev.history.slice(0, prev.index + 1);
      const lastState = newHistory[newHistory.length - 1];
      if (JSON.stringify(lastState) === JSON.stringify(elements)) {
        return prev; // No change, don't increment index
      }
      
      newHistory.push(elements);
      if (newHistory.length > 50) {
        newHistory.shift();
        return { history: newHistory, index: 49 };
      }
      return { history: newHistory, index: newHistory.length - 1 };
    });
  }, [elements]);

  const handleUndo = () => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        isUndoRedoRef.current = true;
        const newIndex = prev.index - 1;
        setElements(prev.history[newIndex]);
        setSelectedElementIds([]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setHistoryState(prev => {
      if (prev.index < prev.history.length - 1) {
        isUndoRedoRef.current = true;
        const newIndex = prev.index + 1;
        setElements(prev.history[newIndex]);
        setSelectedElementIds([]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  };

  const handleAddElement = (type, x = 50, y = 50) => {
    if (type === "zone-template") {
      const zoneId = `zone-${Date.now()}`;
      const newZone = {
        id: zoneId,
        type: "zone",
        x, y, w: 330, h: 220, rot: 0, name: "", color: "purple"
      };
      
      const slots = [];

      for (let i = 0; i < 10; i++) {
        const row = Math.floor(i / 5); // 0 or 1
        const col = i % 5; // 0 to 4
        slots.push({
          id: `slot-${Date.now()}-${i}`,
          parentId: zoneId,
          type: "slot",
          x: x + 20 + (col * 60),
          y: y + 20 + (row * 100),
          w: 50, h: 80, rot: 0, name: "", color: "purple"
        });
      }
      
      setElements((prev) => [...prev, newZone, ...slots]);
      return;
    }

    let w = 50, h = 50, name = "";
    if (type === "zone") { w = 200; h = 100; name = "New Zone"; }
    else if (type.startsWith("slot")) { 
       w = 50; 
       h = 80; 
       name = ""; 
    }
    else if (type === "wall") { w = 200; h = 15; name = "Wall"; }
    else if (type === "road") { w = 150; h = 50; name = "ONE WAY"; }
    else if (type === "pillar") { w = 40; h = 40; name = "P1"; }
    else if (type === "sign") { w = 40; h = 40; name = "SPEED 5"; }
    else if (type === "ramp") { w = 80; h = 200; name = "RAMP UP"; }
    else if (type === "elevator") { w = 80; h = 80; name = "ELEVATOR"; }
    else if (type === "kiosk") { w = 40; h = 40; name = "PAYMENT"; }
    
    const newElement = {
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      w,
      h,
      rot: 0,
      name,
      color: "purple",
    };
    setElements((prev) => [...prev, newElement]);
  };

  const handleUpdateElement = (id, changes) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...changes } : el));
  };

  const handleRemoveElements = (idsToRemove) => {
    setElements(prev => prev.filter(el => {
      if (idsToRemove.includes(el.id)) return false;
      // If the element has a parentId, check if its parent is being removed
      if (el.parentId && idsToRemove.includes(el.parentId)) return false;
      return true;
    }));
    setSelectedElementIds(prev => prev.filter(id => !idsToRemove.includes(id)));
  };

  const generateNextName = (baseName, existingElements) => {
    if (!baseName) return "";
    const match = baseName.match(/^(.*\D)?(\d+)(\D*)$/);
    if (!match) return baseName;
    const prefix = match[1] || '';
    const numStr = match[2];
    const suffix = match[3] || '';
    let num = parseInt(numStr, 10);
    let nextName = baseName;
    do {
      num++;
      const nextNumStr = String(num).padStart(numStr.length, '0');
      nextName = `${prefix}${nextNumStr}${suffix}`;
    } while (existingElements.some(e => e.name === nextName));
    return nextName;
  };

  const handleAlign = (type) => {
    const selected = elements.filter(el => selectedElementIds.includes(el.id));
    if (selected.length < 2) return;
    
    setElements(prev => {
      let minX = Math.min(...selected.map(el => el.x));
      let maxX = Math.max(...selected.map(el => el.x + el.w));
      let minY = Math.min(...selected.map(el => el.y));
      let maxY = Math.max(...selected.map(el => el.y + el.h));
      
      return prev.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        if (type === 'left') return { ...el, x: minX };
        if (type === 'right') return { ...el, x: maxX - el.w };
        if (type === 'center') return { ...el, x: minX + (maxX - minX) / 2 - el.w / 2 };
        if (type === 'top') return { ...el, y: minY };
        if (type === 'bottom') return { ...el, y: maxY - el.h };
        if (type === 'middle') return { ...el, y: minY + (maxY - minY) / 2 - el.h / 2 };
        return el;
      });
    });
  };

  const handleDistribute = (axis) => {
    const selected = elements.filter(el => selectedElementIds.includes(el.id));
    if (selected.length < 3) return;

    const sorted = [...selected].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    const totalDistance = last[axis] - first[axis];
    const step = totalDistance / (sorted.length - 1);
    
    const updates = {};
    sorted.forEach((el, index) => {
      updates[el.id] = first[axis] + step * index;
    });

    setElements(prev => prev.map(el => {
      if (updates[el.id] !== undefined) {
        return { ...el, [axis]: Math.round(updates[el.id]) };
      }
      return el;
    }));
  };

  // Keyboard Shortcuts (Delete, Copy, Paste, Duplicate, Undo, Redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const currentSelected = elements.filter(el => selectedElementIds.includes(el.id));

      // Undo (Ctrl+Z)
      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
         e.preventDefault();
         handleUndo();
         return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if (isCmdOrCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
         e.preventDefault();
         handleRedo();
         return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementIds.length > 0) {
          handleRemoveElements(selectedElementIds);
        }
      }
      
      // Copy (Ctrl+C)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c' && currentSelected.length > 0) {
         e.preventDefault();
         clipboardRef.current = [...currentSelected];
      }
      
      // Paste (Ctrl+V)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v' && clipboardRef.current && clipboardRef.current.length > 0) {
         e.preventDefault();
         setElements(prev => {
            const newEls = [];
            let currentAll = [...prev];
            clipboardRef.current.forEach(el => {
               const newName = generateNextName(el.name, currentAll);
               const newEl = { 
                 ...el, 
                 id: `${el.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                 name: newName,
                 x: el.x + 20, 
                 y: el.y + 20 
               };
               newEls.push(newEl);
               currentAll.push(newEl);
            });
            setSelectedElementIds(newEls.map(el => el.id));
            clipboardRef.current = newEls; // For next paste
            return currentAll;
         });
      }

      // Duplicate (Ctrl+D)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd' && currentSelected.length > 0) {
         e.preventDefault();
         setElements(prev => {
            const newEls = [];
            let currentAll = [...prev];
            currentSelected.forEach(el => {
               const newName = generateNextName(el.name, currentAll);
               const newEl = { 
                 ...el, 
                 id: `${el.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                 name: newName,
                 x: el.x + 20, 
                 y: el.y + 20 
               };
               newEls.push(newEl);
               currentAll.push(newEl);
            });
            setSelectedElementIds(newEls.map(el => el.id));
            return currentAll;
         });
      }
      
      // Arrow Key Nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && currentSelected.length > 0) {
         e.preventDefault();
         const step = e.shiftKey ? 10 : 1;
         let dx = 0, dy = 0;
         if (e.key === 'ArrowUp') dy = -step;
         if (e.key === 'ArrowDown') dy = step;
         if (e.key === 'ArrowLeft') dx = -step;
         if (e.key === 'ArrowRight') dx = step;
         
         setElements(prev => prev.map(el => {
           if (selectedElementIds.includes(el.id)) {
             return { ...el, x: el.x + dx, y: el.y + dy };
           }
           return el;
         }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementIds, elements]);

  // Sidebar Resizing logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        setLeftSidebarWidth(Math.max(200, Math.min(500, e.clientX)));
      }
      if (isResizingRight) {
        setRightSidebarWidth(Math.max(200, Math.min(600, window.innerWidth - e.clientX)));
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Prevent default scroll on wheel in the canvas wrapper (fixes Ctrl+Scroll browser zoom)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const handleWheelNative = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(s => Math.max(0.2, Math.min(3, s - e.deltaY * 0.005)));
      } else {
        // Standard mouse wheel pan
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    if (wrapper) {
      wrapper.addEventListener("wheel", handleWheelNative, { passive: false });
    }
    return () => {
      if (wrapper) {
        wrapper.removeEventListener("wheel", handleWheelNative);
      }
    };
  }, []);

  const handleSave = () => {
    onSave({ width: 1000, height: 600, elements });
  };

  const renderToolButton = (icon, label, type) => (
    <button 
      onClick={() => handleAddElement(type)} 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("type", type);
      }}
      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 rounded-lg border border-white/5 hover:border-cyan-500/30 transition text-sm text-left cursor-grab active:cursor-grabbing"
    >
      {icon} {label}
    </button>
  );

  const renderElementContent = (el) => {
    switch (el.type) {
      case 'slot': return <div className="flex flex-col items-center"><span className="text-[10px]">{el.name}</span><Car size={20} className="text-gray-400"/></div>;
      case 'slot-ev': return <div className="flex flex-col items-center"><span className="text-[10px] text-emerald-400">{el.name || 'EV'}</span><Zap size={20} className="text-emerald-400"/></div>;
      case 'slot-handicap': return <div className="flex flex-col items-center"><span className="text-[10px] text-blue-400">{el.name || '♿'}</span><Accessibility size={20} className="text-blue-400"/></div>;
      case 'gate': return <div className="text-green-400 font-bold border border-green-400 px-2 rounded-sm bg-green-400/20">{el.name || 'GATE'}</div>;
      case 'road': return <div className="flex items-center gap-1 text-yellow-400"><ArrowRight size={24}/> <span className="font-bold text-xs">{el.name}</span></div>;
      case 'bump': return <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }}></div>;
      case 'wall': return <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }}></div>;
      case 'pillar': return <div className="bg-slate-500 w-full h-full flex items-center justify-center font-bold text-xs">{el.name}</div>;
      case 'ramp': return <div className="flex flex-col items-center bg-slate-700/50 w-full h-full justify-center text-xs"><Navigation size={20}/><span className="mt-1">{el.name}</span></div>;
      case 'elevator': return <div className="flex flex-col items-center bg-slate-800/80 w-full h-full justify-center text-[10px]"><Layers size={20}/><span className="mt-1">{el.name}</span></div>;
      case 'kiosk': return <div className="flex flex-col items-center bg-sky-900/50 w-full h-full justify-center text-[10px] text-sky-300"><MonitorSmartphone size={16}/><span>{el.name}</span></div>;
      case 'sign': return <div className="bg-red-500 rounded-full w-8 h-8 flex items-center justify-center text-[8px] font-bold text-center leading-tight">{el.name}</div>;
      case 'planter': return <div className="flex gap-1 text-emerald-500"><TreePine size={20}/><TreePine size={20}/></div>;
      case 'zone': 
        if (el.shape === 'circle') {
          return <div className="w-full h-full rounded-full flex items-center justify-center bg-black/50 text-xs font-bold text-cyan-200">{el.name || el.type}</div>;
        }
        if (el.shape === 'triangle') {
          return <div className="w-full h-full flex items-center justify-center bg-black/50 text-xs font-bold text-cyan-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', paddingTop: '20%' }}>{el.name || el.type}</div>;
        }
        return (
          <div className="w-full h-full rounded border-2 border-dashed border-cyan-500/30 bg-black/20 pointer-events-none">
            <div className="absolute -top-3 left-4 bg-[#181c23] border border-cyan-500/50 rounded-full px-3 shadow-md">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">{el.name || el.type}</span>
            </div>
          </div>
        );
      default: return <span className="text-xs font-bold bg-black/50 px-2 py-1 rounded">{el.name || el.type}</span>;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#12151c] text-white">
      {/* Left Sidebar Palette */}
      <div 
        className="border-r border-white/10 bg-[#181c23] flex flex-col relative shrink-0"
        style={{ width: leftSidebarWidth }}
      >
        <div className="p-4 border-b border-white/10">
           <h2 className="font-bold text-lg text-cyan-400">Design Tools</h2>
           <p className="text-xs text-gray-400 mt-1">Select category to add elements</p>
        </div>
        
        {/* Categories Tabs */}
        <div className="flex bg-black/20 p-2 gap-1 border-b border-white/10 overflow-x-auto hide-scrollbar">
           <button onClick={() => setActiveCategory("spaces")} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition ${activeCategory === "spaces" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Spaces</button>
           <button onClick={() => setActiveCategory("traffic")} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition ${activeCategory === "traffic" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Traffic</button>
           <button onClick={() => setActiveCategory("infra")} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition ${activeCategory === "infra" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Infra</button>
           <button onClick={() => setActiveCategory("facilities")} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition ${activeCategory === "facilities" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Facilities</button>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {activeCategory === "spaces" && (
            <>
              {renderToolButton(<Box size={16}/>, "Zone Area", "zone")}
              {renderToolButton(<Box size={16} className="text-cyan-400"/>, "Zone (10 Slots)", "zone-template")}
              {renderToolButton(<div className="w-4 h-4 border border-dashed border-current"></div>, "Standard Slot", "slot")}
              {renderToolButton(<Zap size={16}/>, "EV Charging Slot", "slot-ev")}
              {renderToolButton(<Accessibility size={16}/>, "Handicap Slot", "slot-handicap")}
            </>
          )}
          {activeCategory === "traffic" && (
            <>
              {renderToolButton(<Type size={16}/>, "Gate (In/Out)", "gate")}
              {renderToolButton(<ArrowRight size={16}/>, "Road Arrow", "road")}
              {renderToolButton(<Minus size={16}/>, "Zebra / Bump", "bump")}
            </>
          )}
          {activeCategory === "infra" && (
            <>
              {renderToolButton(<Minus size={16}/>, "Wall / Barrier", "wall")}
              {renderToolButton(<Square size={16}/>, "Pillar", "pillar")}
              {renderToolButton(<Navigation size={16}/>, "Ramp (Floor Access)", "ramp")}
              {renderToolButton(<Layers size={16}/>, "Elevator / Stairs", "elevator")}
            </>
          )}
          {activeCategory === "facilities" && (
            <>
              {renderToolButton(<MonitorSmartphone size={16}/>, "Payment Kiosk", "kiosk")}
              {renderToolButton(<AlertCircle size={16}/>, "Signage", "sign")}
              {renderToolButton(<Type size={16}/>, "Planter / Tree", "planter")}
            </>
          )}
        </div>
        {/* Resizer Handle */}
        <div 
           className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyan-500/50 z-10"
           onMouseDown={(e) => { e.preventDefault(); setIsResizingLeft(true); }}
        />
      </div>

      {/* Center Canvas */}
      <div 
        ref={wrapperRef}
        className="flex-1 overflow-hidden relative bg-[#0b0e16]"
        onMouseDown={(e) => {
          if (e.button === 1 || e.shiftKey || e.button === 2) {
             setIsPanning(true);
             setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }
        }}
        onMouseMove={(e) => {
          if (isPanning) {
             setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Canvas background grid that moves with pan */}
        <div className="absolute inset-0 pointer-events-none opacity-50"
             style={{ 
               backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`, 
               backgroundSize: `${20 * scale}px ${20 * scale}px`,
               backgroundPosition: `${pan.x}px ${pan.y}px`
             }}></div>

        {/* The Map Container (1000x600) */}
        <div 
           className="absolute left-1/2 top-1/2 bg-black/60 border border-white/20 shadow-2xl transition-transform origin-center"
           style={{ 
              width: 1000, 
              height: 600,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`
           }}
           ref={canvasRef}
           onClick={() => setSelectedElementIds([])}
           onDragOver={(e) => e.preventDefault()}
           onDrop={(e) => {
             e.preventDefault();
             const type = e.dataTransfer.getData("type");
             if (type && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                // Calculate drop coordinates factoring in scale
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;
                // Snap to 10x10 grid on drop
                const snapX = Math.round(x / 10) * 10;
                const snapY = Math.round(y / 10) * 10;
                handleAddElement(type, snapX, snapY);
             }
           }}
        >
          {/* Smart Guides Overlay */}
          {guides.map((g, i) => 
            g.type === 'v' 
              ? <div key={`g-${i}`} className="absolute top-0 bottom-0 border-l border-dashed border-[#06b6d4] z-[100] pointer-events-none" style={{ left: g.pos, opacity: 0.8 }}></div>
              : <div key={`g-${i}`} className="absolute left-0 right-0 border-t border-dashed border-[#06b6d4] z-[100] pointer-events-none" style={{ top: g.pos, opacity: 0.8 }}></div>
          )}

          {elements.map((el) => (
            <Rnd
              key={el.id}
              size={{ width: el.w, height: el.h }}
              position={{ x: el.x, y: el.y }}
              dragGrid={[10, 10]}
              resizeGrid={[10, 10]}
              scale={scale}
              onDrag={(e, d) => {
                 // Calculate guides for active element
                 const activeRect = { left: d.x, right: d.x + el.w, top: d.y, bottom: d.y + el.h, centerX: d.x + el.w/2, centerY: d.y + el.h/2 };
                 const newGuides = [];
                 const threshold = 5;

                 elements.forEach(other => {
                   if (selectedElementIds.includes(other.id) || other.id === el.id) return;
                   
                   const otherRect = { left: other.x, right: other.x + other.w, top: other.y, bottom: other.y + other.h, centerX: other.x + other.w/2, centerY: other.y + other.h/2 };

                   // Horizontal alignment lines (Vertical Y axis guides)
                   if (Math.abs(activeRect.left - otherRect.left) < threshold) newGuides.push({ type: 'v', pos: otherRect.left });
                   if (Math.abs(activeRect.right - otherRect.right) < threshold) newGuides.push({ type: 'v', pos: otherRect.right });
                   if (Math.abs(activeRect.centerX - otherRect.centerX) < threshold) newGuides.push({ type: 'v', pos: otherRect.centerX });

                   // Vertical alignment lines (Horizontal X axis guides)
                   if (Math.abs(activeRect.top - otherRect.top) < threshold) newGuides.push({ type: 'h', pos: otherRect.top });
                   if (Math.abs(activeRect.bottom - otherRect.bottom) < threshold) newGuides.push({ type: 'h', pos: otherRect.bottom });
                   if (Math.abs(activeRect.centerY - otherRect.centerY) < threshold) newGuides.push({ type: 'h', pos: otherRect.centerY });
                 });
                 setGuides(newGuides);
              }}
              onDragStop={(e, d) => {
                 setGuides([]); // clear guides
                 if (selectedElementIds.includes(el.id) && selectedElementIds.length > 1) {
                    const dx = d.x - el.x;
                    const dy = d.y - el.y;
                    setElements(prev => prev.map(item => {
                       if (selectedElementIds.includes(item.id)) {
                          return { ...item, x: item.x + dx, y: item.y + dy };
                       }
                       // Also move children if a selected parent moves
                       if (item.parentId && selectedElementIds.includes(item.parentId)) {
                          return { ...item, x: item.x + dx, y: item.y + dy };
                       }
                       return item;
                    }));
                 } else {
                    const dx = d.x - el.x;
                    const dy = d.y - el.y;
                    if (dx !== 0 || dy !== 0) {
                      setElements(prev => prev.map(item => {
                        if (item.id === el.id) return { ...item, x: d.x, y: d.y };
                        if (item.parentId === el.id) return { ...item, x: item.x + dx, y: item.y + dy };
                        return item;
                      }));
                    }
                 }
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                handleUpdateElement(el.id, {
                  w: parseInt(ref.style.width, 10),
                  h: parseInt(ref.style.height, 10),
                  ...position,
                });
              }}
              disableDragging={!!el.parentId}
              bounds="parent"
              className={`border ${selectedElementIds.includes(el.id) ? 'border-cyan-400 z-50' : 'border-white/30 z-10'} bg-white/10 backdrop-blur-sm cursor-move`}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (e.shiftKey) {
                   setSelectedElementIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
                } else {
                   if (!selectedElementIds.includes(el.id)) {
                      setSelectedElementIds([el.id]);
                   }
                }
              }}
            >
              <div 
                className={`w-full h-full flex items-center justify-center pointer-events-none ${el.type === 'zone' ? '' : 'overflow-hidden'}`}
                style={{ transform: `rotate(${el.rot || 0}deg)` }}
              >
                {renderElementContent(el)}
              </div>
            </Rnd>
          ))}
        </div>
        
        {/* Top Floating Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={onCancel} className="bg-red-500/20 text-red-400 px-4 py-2 rounded font-bold hover:bg-red-500/40 transition">Cancel</button>
          <button onClick={handleSave} className="bg-cyan-500 text-black px-4 py-2 rounded font-bold hover:bg-cyan-400 transition flex items-center gap-2"><Save size={16}/> Save Map</button>
        </div>
      </div>

      {/* Right Sidebar Properties */}
      <div 
        className="border-l border-white/10 bg-[#181c23] p-6 flex flex-col gap-4 relative shrink-0"
        style={{ width: rightSidebarWidth }}
      >
        {/* Resizer Handle */}
        <div 
           className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-cyan-500/50 z-10"
           onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }}
        />
        <h2 className="font-bold text-lg text-cyan-400 mb-2">Properties</h2>
        {selectedElementIds.length === 0 ? (
          <div className="text-gray-500 text-sm flex h-full items-center justify-center text-center">
            Select an element on the canvas to edit its properties.
          </div>
        ) : selectedElementIds.length > 1 ? (
          <div className="flex flex-col gap-4">
            <div className="text-gray-300 text-sm text-center bg-cyan-500/10 p-4 rounded border border-cyan-500/20">
               {selectedElementIds.length} elements selected
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Align & Distribute</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAlign('left')} className="bg-white/5 hover:bg-white/10 text-xs py-2 rounded text-cyan-300 transition">Align Left</button>
                <button onClick={() => handleAlign('center')} className="bg-white/5 hover:bg-white/10 text-xs py-2 rounded text-cyan-300 transition">Align Center</button>
                <button onClick={() => handleAlign('top')} className="bg-white/5 hover:bg-white/10 text-xs py-2 rounded text-cyan-300 transition">Align Top</button>
                <button onClick={() => handleAlign('middle')} className="bg-white/5 hover:bg-white/10 text-xs py-2 rounded text-cyan-300 transition">Align Middle</button>
                <button onClick={() => handleDistribute('x')} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-xs py-2 rounded text-cyan-400 font-bold transition col-span-2">Distribute Horizontally</button>
                <button onClick={() => handleDistribute('y')} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-xs py-2 rounded text-cyan-400 font-bold transition col-span-2">Distribute Vertically</button>
              </div>
            </div>

            <button onClick={() => handleRemoveElements(selectedElementIds)} className="mt-4 bg-red-500/10 text-red-400 border border-red-500/30 rounded p-2 font-bold hover:bg-red-500/20 transition">
              Delete Selected
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(() => {
              const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
              if (!selectedElement) return null;
              return (
                <>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Type</label>
                    {selectedElement.type.startsWith('slot') ? (
                      <select value={selectedElement.type} onChange={(e) => handleUpdateElement(selectedElement.id, { type: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-cyan-500 outline-none transition">
                        <option value="slot">Standard Slot</option>
                        <option value="slot-ev">EV Charging Slot</option>
                        <option value="slot-handicap">Handicap Slot</option>
                      </select>
                    ) : (
                      <input type="text" value={selectedElement.type} disabled className="w-full bg-black/30 border border-white/10 rounded p-2 text-white opacity-50" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Name / Label</label>
                    <input type="text" value={selectedElement.name || ""} onChange={(e) => handleUpdateElement(selectedElement.id, { name: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-cyan-500 outline-none transition" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">X</label>
                      <input type="number" value={selectedElement.x} onChange={(e) => handleUpdateElement(selectedElement.id, { x: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Y</label>
                      <input type="number" value={selectedElement.y} onChange={(e) => handleUpdateElement(selectedElement.id, { y: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Width</label>
                      <input type="number" value={selectedElement.w} onChange={(e) => handleUpdateElement(selectedElement.id, { w: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Height</label>
                      <input type="number" value={selectedElement.h} onChange={(e) => handleUpdateElement(selectedElement.id, { h: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex justify-between">
                      <span>Rotation</span>
                      <span className="text-cyan-400">{selectedElement.rot || 0}°</span>
                    </label>
                    <input type="range" min="0" max="360" step="15" value={selectedElement.rot || 0} onChange={(e) => handleUpdateElement(selectedElement.id, { rot: Number(e.target.value) })} className="w-full accent-cyan-500" />
                  </div>
                  {selectedElement.type === "zone" && (
                    <>
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Shape</label>
                        <select value={selectedElement.shape || "rectangle"} onChange={(e) => handleUpdateElement(selectedElement.id, { shape: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-cyan-500 outline-none transition">
                          <option value="rectangle">Rectangle</option>
                          <option value="circle">Circle</option>
                          <option value="triangle">Triangle</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Color Theme</label>
                        <select value={selectedElement.color || "purple"} onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white focus:border-cyan-500 outline-none transition">
                          <option value="purple">Purple</option>
                          <option value="emerald">Emerald</option>
                          <option value="blue">Blue</option>
                          <option value="amber">Amber</option>
                        </select>
                      </div>
                    </>
                  )}
                  <button onClick={() => handleRemoveElements([selectedElement.id])} className="mt-4 bg-red-500/10 text-red-400 border border-red-500/30 rounded p-2 font-bold hover:bg-red-500/20 transition">
                    Delete Element
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
