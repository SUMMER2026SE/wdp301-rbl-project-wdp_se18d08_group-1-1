import { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { Save, Box, Type, Minus, ArrowRight, Square, AlertCircle, Zap, Accessibility, Navigation, Layers, MonitorSmartphone, TreePine, Car } from "lucide-react";

const createElementId = (prefix, suffix = "") =>
  `${prefix}-${Date.now()}${suffix ? `-${suffix}` : ""}-${Math.random().toString(36).substring(7)}`;

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

  // Smart Grid State
  const [gridConfig, setGridConfig] = useState({ rows: 2, cols: 5, angle: 0, prefix: 'A', start: 1 });

  // Undo/Redo State
  const [, setHistoryState] = useState({
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
    let w = 50, h = 50, name = "";
    if (type === "zone") { 
      w = 250; h = 150; 
      
      // Auto-generate Zone name (ZONE A, ZONE B... ZONE AA, etc.)
      const existingZoneNames = elements.filter(el => el.type === 'zone').map(el => el.name);
      let i = 0;
      const getLabel = (idx) => {
        let result = '';
        let temp = idx;
        while (temp >= 0) {
          result = String.fromCharCode(65 + (temp % 26)) + result;
          temp = Math.floor(temp / 26) - 1;
        }
        return result;
      };
      
      while (true) {
        const candidate = `ZONE ${getLabel(i)}`;
        if (!existingZoneNames.includes(candidate)) {
          name = candidate;
          break;
        }
        i++;
      }
    }
    else if (type.startsWith("slot")) { 
       w = 50; 
       h = 100; // Realistic 1:2 ratio (2.5m x 5m)
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
      id: createElementId(type),
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

  const handleAutoFillZone = (slotElement) => {
    if (!slotElement.name || !slotElement.name.trim()) {
      alert("Please enter a name for this slot first (e.g., 'A1').");
      return;
    }
    
    const siblings = elements.filter(el => el.parentId === slotElement.parentId && el.id !== slotElement.id && el.type.startsWith('slot'));
    if (siblings.length === 0) return;
    
    // Sort siblings row by row (top to bottom, then left to right)
    siblings.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 20) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    
    setElements(prev => {
      const nextElements = [...prev];
      let currentName = slotElement.name.trim();
      
      siblings.forEach(sib => {
        const index = nextElements.findIndex(e => e.id === sib.id);
        if (index !== -1) {
          const newName = generateNextName(currentName, nextElements);
          nextElements[index] = { ...nextElements[index], name: newName };
          currentName = newName;
        }
      });
      return nextElements;
    });
  };

  const handleGenerateGrid = (zone) => {
    const rows = gridConfig.rows;
    const cols = gridConfig.cols;
    const angle = gridConfig.angle;

    // Remove existing slots in this zone
    const filteredElements = elements.filter(el => el.parentId !== zone.id);
    
    const slotW = angle === 90 ? 100 : 50;
    const slotH = angle === 90 ? 50 : 100;
    const spacing = 10;
    
    // Calculate new zone dimensions
    const newZoneW = cols * slotW + (cols + 1) * spacing;
    const newZoneH = rows * slotH + (rows + 1) * spacing;
    
    // Update zone
    const updatedZone = { ...zone, w: newZoneW, h: newZoneH };
    const finalElements = filteredElements.map(el => el.id === zone.id ? updatedZone : el);
    
    // Generate slots
    const newSlots = [];
    let count = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const prefix = (gridConfig.prefix || '').toUpperCase();
        newSlots.push({
          id: createElementId("slot"),
          parentId: zone.id,
          type: "slot",
          x: updatedZone.x + spacing + c * (slotW + spacing),
          y: updatedZone.y + spacing + r * (slotH + spacing),
          w: slotW,
          h: slotH,
          rot: gridConfig.angle,
          name: `${prefix}${count + gridConfig.start - 1}`,
          color: "purple"
        });
        count++;
      }
    }
    
    setElements([...finalElements, ...newSlots]);
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
                 id: createElementId(el.type),
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
            
            // Helper to get new Zone name
            const getLabel = (idx) => {
               let result = '';
               let temp = idx;
               while (temp >= 0) {
                 result = String.fromCharCode(65 + (temp % 26)) + result;
                 temp = Math.floor(temp / 26) - 1;
               }
               return result;
            };

            currentSelected.forEach(el => {
               if (el.type === 'zone') {
                  // Find new zone name (case insensitive)
                  const existingZoneNames = currentAll.filter(e => e.type === 'zone').map(e => (e.name || "").toUpperCase());
                  let idx = 0;
                  let newZoneName = '';
                  let newPrefix = '';
                  while (true) {
                     newPrefix = getLabel(idx);
                     newZoneName = `ZONE ${newPrefix}`;
                     if (!existingZoneNames.includes(newZoneName)) break;
                     idx++;
                  }
                  
                  const oldPrefix = (el.name || "").replace(/ZONE\s+/i, '').trim();
                  const newZoneId = createElementId('zone');
                  
                  const newZone = { 
                     ...el, 
                     id: newZoneId,
                     name: newZoneName,
                     x: el.x + 30, 
                     y: el.y + 30 
                  };
                  newEls.push(newZone);
                  currentAll.push(newZone);

                  // Duplicate all children (slots)
                  const children = currentAll.filter(c => c.parentId === el.id);
                  children.forEach(child => {
                     // Replace old prefix with new prefix in child name (e.g. A1 -> B1)
                     let newChildName = child.name;
                     if (oldPrefix && newChildName.startsWith(oldPrefix)) {
                        newChildName = newPrefix + newChildName.substring(oldPrefix.length);
                     }
                     const newChild = {
                        ...child,
                        id: createElementId(child.type),
                        parentId: newZoneId,
                        name: newChildName,
                        x: child.x + 30,
                        y: child.y + 30
                     };
                     currentAll.push(newChild);
                     newEls.push(newChild); // Push to newEls so it can be selected too
                  });
               } else {
                  // If it's a child of a selected zone, it's already duplicated above!
                  // We only duplicate it normally if it's NOT a child of a selected zone
                  if (el.parentId && currentSelected.some(s => s.id === el.parentId && s.type === 'zone')) {
                     return; // Skip, already handled
                  }

                  // Not a zone, just duplicate normally
                  const newName = generateNextName(el.name, currentAll);
                  const newEl = { 
                    ...el, 
                    id: createElementId(el.type),
                    name: newName,
                    x: el.x + 20, 
                    y: el.y + 20 
                  };
                  newEls.push(newEl);
                  currentAll.push(newEl);
               }
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
    const zones = elements.filter(el => el.type === 'zone');
    
    // 1. Check if any Zone is unnamed
    for (const z of zones) {
      if (!z.name || z.name.trim() === '') {
        alert("Cannot save map! Found a Zone without a name. All Zones must be named.");
        return;
      }
    }

    // 2. Check for duplicate zone names
    const zoneNames = zones.map(el => el.name.trim());
    const duplicateZone = zoneNames.find((name, index) => zoneNames.indexOf(name) !== index);
    if (duplicateZone) {
      alert(`Cannot save map! Duplicate zone name "${duplicateZone}" detected. Zone names must be unique within a floor.`);
      return;
    }

    // 3. Check for duplicate slot names
    const namedSlots = elements.filter(el => el.type.startsWith('slot') && el.name && el.name.trim() !== '');
    const slotNames = namedSlots.map(el => el.name.trim());
    
    const duplicateSlot = slotNames.find((name, index) => slotNames.indexOf(name) !== index);
    if (duplicateSlot) {
      alert(`Cannot save map! Duplicate parking slot name "${duplicateSlot}" detected. Slot names must be unique.`);
      return;
    }

    // 4. Check if every named slot falls inside a Zone's bounding box
    for (const slot of namedSlots) {
       const slotCenterX = slot.x + slot.w / 2;
       const slotCenterY = slot.y + slot.h / 2;
       
       const insideZone = zones.find(z => 
          slotCenterX >= z.x && slotCenterX <= (z.x + z.w) &&
          slotCenterY >= z.y && slotCenterY <= (z.y + z.h)
       );

       if (!insideZone) {
          alert(`Cannot save map! Parking slot "${slot.name}" is placed outside of any Zone. Please drag it into a valid Zone boundary.`);
          return;
       }
    }

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
      case 'slot': 
        return (
          <div className="w-full h-full relative border-l-4 border-r-4 border-white/80 box-border bg-[#2c3038] group transition-colors hover:bg-[#333842]">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gray-500 rounded shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70">
              <span className="text-[16px] font-bold text-white uppercase tracking-widest">{el.name}</span>
            </div>
            {!el.name && <Car size={24} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 opacity-20" />}
          </div>
        );
      case 'slot-ev': 
        return (
          <div className="w-full h-full relative border-l-4 border-r-4 border-emerald-500/80 box-border bg-[#2c3038] group transition-colors hover:bg-[#333842]">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-emerald-600 rounded shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80">
              <Zap size={20} className="text-emerald-400 mb-1"/>
              <span className="text-[14px] font-bold text-emerald-400 uppercase tracking-widest">{el.name || 'EV'}</span>
            </div>
          </div>
        );
      case 'slot-handicap': 
        return (
          <div className="w-full h-full relative border-l-4 border-r-4 border-blue-500/80 box-border bg-[#2c3038] group transition-colors hover:bg-[#333842]">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-blue-600 rounded shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80">
              <Accessibility size={20} className="text-blue-400 mb-1"/>
              <span className="text-[14px] font-bold text-blue-400 uppercase tracking-widest">{el.name || '♿'}</span>
            </div>
          </div>
        );
      case 'gate': return <div className="text-green-400 font-bold border border-green-400 px-2 rounded-sm bg-green-400/20">{el.name || 'GATE'}</div>;
      case 'road': return <div className="flex items-center gap-1 text-yellow-400"><ArrowRight size={24}/> <span className="font-bold text-xs">{el.name}</span></div>;
      case 'bump': return <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }}></div>;
      case 'wall': return <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }}></div>;
      case 'pillar': return <div className="bg-slate-500 w-full h-full flex items-center justify-center font-bold text-xs shadow-xl">{el.name}</div>;
      case 'ramp': return <div className="flex flex-col items-center bg-slate-700/50 w-full h-full justify-center text-xs border border-white/10"><Navigation size={20}/><span className="mt-1">{el.name}</span></div>;
      case 'elevator': return <div className="flex flex-col items-center bg-slate-800/80 w-full h-full justify-center text-[10px] border border-white/10"><Layers size={20}/><span className="mt-1">{el.name}</span></div>;
      case 'kiosk': return <div className="flex flex-col items-center bg-sky-900/50 w-full h-full justify-center text-[10px] text-sky-300 border border-sky-500/50"><MonitorSmartphone size={16}/><span>{el.name}</span></div>;
      case 'sign': return <div className="bg-red-500 rounded-full w-8 h-8 flex items-center justify-center text-[8px] font-bold text-center leading-tight shadow-md border-2 border-white">{el.name}</div>;
      case 'planter': return <div className="flex gap-1 text-emerald-500"><TreePine size={20}/><TreePine size={20}/></div>;
      case 'zone': 
        if (el.shape === 'circle') {
          return <div className="w-full h-full rounded-full flex items-center justify-center bg-black/50 text-xs font-bold text-cyan-200">{el.name || el.type}</div>;
        }
        if (el.shape === 'triangle') {
          return <div className="w-full h-full flex items-center justify-center bg-black/50 text-xs font-bold text-cyan-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', paddingTop: '20%' }}>{el.name || el.type}</div>;
        }
        return (
          <div className="w-full h-full relative pointer-events-none">
            {/* Background layer with hidden overflow for asphalt texture */}
            <div className="absolute inset-0 rounded bg-[#20232a] border border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-white" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
            </div>
            
            {/* Zone Name Tag (floating outside the box) */}
            <div 
               className={`absolute -top-6 left-0 px-3 py-1 rounded-t-md bg-[#181c23] border border-b-0 shadow-md font-bold text-[10px] tracking-widest uppercase select-none pointer-events-auto cursor-pointer hover:bg-slate-800 transition-colors ${!el.name ? 'text-red-400 border-red-500/50 z-50' : 'text-cyan-300 border-cyan-500/50 z-20'}`}
               onMouseDown={(e) => {
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
              {el.name || 'UNNAMED ZONE'}
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
           className="absolute left-1/2 top-1/2 bg-white/95 border-2 border-cyan-500/80 shadow-[0_0_50px_rgba(6,182,212,0.2)] rounded-[2rem] transition-transform origin-center"
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
                      setElements(prev => {
                        let nextElements = prev.map(item => {
                          if (item.id === el.id) return { ...item, x: d.x, y: d.y };
                          if (item.parentId === el.id) return { ...item, x: item.x + dx, y: item.y + dy };
                          return item;
                        });

                        // Auto-parenting logic for slots dropped into zones
                        if (el.type.startsWith('slot')) {
                           const slotCenterX = d.x + el.w / 2;
                           const slotCenterY = d.y + el.h / 2;
                           
                           // Find if the center of the slot is inside any zone
                           // Note: we use 'prev' to find the zone, as zone hasn't moved
                           const targetZone = prev.find(z => z.type === 'zone' && 
                             slotCenterX >= z.x && slotCenterX <= (z.x + z.w) &&
                             slotCenterY >= z.y && slotCenterY <= (z.y + z.h)
                           );

                           if (targetZone && el.parentId !== targetZone.id) {
                             nextElements = nextElements.map(item => item.id === el.id ? { ...item, parentId: targetZone.id } : item);
                           } else if (!targetZone && el.parentId) {
                             // Dropped outside any zone, detach parent
                             nextElements = nextElements.map(item => item.id === el.id ? { ...item, parentId: null } : item);
                           }
                        }

                        return nextElements;
                      });
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
              bounds="parent"
              className={`transition-all ${selectedElementIds.includes(el.id) ? 'shadow-[0_0_0_2px_#06b6d4,0_8px_16px_rgba(0,0,0,0.5)] z-50 brightness-110' : 'shadow-sm z-10'} ${el.type === 'zone' ? '' : 'backdrop-blur-sm'} cursor-move`}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (e.shiftKey) {
                   setSelectedElementIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
                } else {
                   if (!selectedElementIds.includes(el.id)) {
                      setSelectedElementIds([el.id]);
                   }
                   // Always sync prefix when a single zone is clicked
                   if (el.type === 'zone' && el.name) {
                      const words = el.name.trim().split(' ');
                      const prefix = words[words.length - 1];
                      setGridConfig(prev => ({ ...prev, prefix }));
                   }
                }
              }}
            >
              <div 
                className={`w-full h-full flex items-center justify-center pointer-events-none`}
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

              // Realtime Validation Checks
              const isZoneNameConflict = selectedElement.type === 'zone' && selectedElement.name && elements.some(el => el.type === 'zone' && el.id !== selectedElement.id && el.name && el.name.trim() === selectedElement.name.trim());
              const isSlotNameConflict = selectedElement.type.startsWith('slot') && selectedElement.name && elements.some(el => el.type.startsWith('slot') && el.id !== selectedElement.id && el.name && el.name.trim() === selectedElement.name.trim());
              const isNameConflict = isZoneNameConflict || isSlotNameConflict;

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
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Name / Label</label>
                    <input 
                      type="text" 
                      value={selectedElement.name || ""} 
                      onChange={(e) => {
                        let val = e.target.value.toUpperCase();
                        // Auto-prefix ZONE if user types a single letter
                        if (selectedElement.type === 'zone') {
                          if (val.length === 1 && /^[A-Z0-9]$/.test(val)) {
                            val = `ZONE ${val}`;
                          }
                          const words = val.trim().split(' ');
                          const prefix = words[words.length - 1] || '';
                          setGridConfig(prev => ({ ...prev, prefix }));
                        }
                        handleUpdateElement(selectedElement.id, { name: val });
                      }} 
                      className={`w-full bg-black/50 border ${isNameConflict ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-white/10'} rounded p-2 text-white font-bold focus:border-cyan-500 transition`} 
                    />
                    {isNameConflict && (
                      <p className="text-red-500 text-[10px] mt-1 font-bold">
                        ⚠️ Duplicate {selectedElement.type === 'zone' ? 'Zone' : 'Slot'} name detected!
                      </p>
                    )}
                    {selectedElement.type.startsWith('slot') && selectedElement.parentId && (
                      <button 
                        onClick={() => handleAutoFillZone(selectedElement)}
                        className="mt-2 w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold py-2 rounded transition border border-cyan-500/30"
                      >
                        Auto-fill remaining slots in zone
                      </button>
                    )}
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
                  
                  {/* Smart Grid Generator for Zones */}
                  {selectedElement.type === 'zone' && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                        <Box size={16} /> Smart Grid Generator
                      </h3>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Prefix</label>
                          <input type="text" value={gridConfig.prefix} onChange={(e) => setGridConfig({...gridConfig, prefix: e.target.value.toUpperCase()})} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" placeholder="e.g. A" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Start #</label>
                          <input type="number" min="1" value={gridConfig.start} onChange={(e) => setGridConfig({...gridConfig, start: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Rows</label>
                          <input type="number" min="1" max="20" value={gridConfig.rows} onChange={(e) => setGridConfig({...gridConfig, rows: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Cols</label>
                          <input type="number" min="1" max="50" value={gridConfig.cols} onChange={(e) => setGridConfig({...gridConfig, cols: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Orientation</label>
                          <select value={gridConfig.angle} onChange={(e) => setGridConfig({...gridConfig, angle: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm">
                            <option value={0}>Vertical Parking (| |)</option>
                            <option value={90}>Horizontal Parking (=)</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleGenerateGrid(selectedElement)}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 rounded transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      >
                        <Car size={18}/> Generate {gridConfig.rows * gridConfig.cols} Slots
                      </button>
                      <p className="text-[10px] text-gray-500 mt-2 text-center leading-tight">This will resize the zone and replace any existing slots inside it.</p>
                    </div>
                  )}

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
