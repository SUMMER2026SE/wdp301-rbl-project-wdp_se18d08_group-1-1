import React, { useEffect, useState } from "react";
import { Car, Zap, Star, ZoomIn, ZoomOut, Maximize, ChevronsRight, ChevronsDown, ChevronsUp, TreePine, X, AlertTriangle, CreditCard, Clock, Phone, User, History, CheckCircle, Info, LogOut } from "lucide-react";

export default function ParkingLots() {
  const [zoom, setZoom] = useState(0.8);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
  const handleResetZoom = () => setZoom(0.8);

  useEffect(() => {
    document.body.classList.add("bg-[#0b0e16]");
    return () => {
      document.body.classList.remove("bg-[#0b0e16]");
    };
  }, []);

  const handleSlotClick = (id, type, index, prefix, timeStatus) => {
    if (type === 'empty') return;
    
    setSelectedSlot({
      id,
      type,
      plate: `${prefix}-${(100+index)}`,
      owner: type === 'monthly' ? 'Nguyen Van A' : 'Walk-in Guest',
      phone: type === 'monthly' ? '090 123 4567' : '--',
      timeRange: type === 'hourly' ? '14:00 - 16:00' : '01/05/2026 - 31/05/2026',
      paymentStatus: type === 'hourly' ? 'Pending' : 'Paid',
      isOverstay: timeStatus === 'overstay',
      entryTime: '13:55:02',
      fee: type === 'hourly' ? '30,000 VND' : '1,500,000 VND/month'
    });
  };

  const renderSlotContent = (id, type, index, platePrefix, colorClass, timeStatus) => {
    if (type === 'empty') return <span className={`text-[10px] font-bold ${colorClass}`}>{id}</span>;
    
    let hourlyBadge = null;
    if (type === 'hourly') {
       if (timeStatus === 'overstay') {
          hourlyBadge = <span className="text-[4.5px] px-[3px] py-[1px] rounded border border-red-500/80 text-red-400 font-black bg-red-500/20 tracking-wider shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse whitespace-nowrap">OVERSTAY</span>;
       } else if (timeStatus === 'warning') {
          hourlyBadge = <span className="text-[4.5px] px-[3px] py-[1px] rounded border border-amber-500/80 text-amber-400 font-black bg-amber-500/20 tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.5)] whitespace-nowrap">EXPIRING</span>;
       } else {
          hourlyBadge = <span className="text-[4.5px] px-[3px] py-[1px] rounded border border-blue-500/50 text-blue-400 font-black bg-blue-500/10 tracking-wider shadow-[0_0_5px_rgba(59,130,246,0.3)] whitespace-nowrap">HOURLY</span>;
       }
    }

    return (
      <>
        <div className="absolute top-[2px] right-[2px]">
          {hourlyBadge}
          {type === 'monthly' && <span className="text-[4.5px] px-[3px] py-[1px] rounded border border-pink-500/50 text-pink-400 font-black bg-pink-500/10 tracking-wider shadow-[0_0_5px_rgba(236,72,153,0.3)] whitespace-nowrap">MONTHLY</span>}
          {type === 'charging' && <span className="text-[4.5px] px-[3px] py-[1px] rounded border border-emerald-500/50 text-emerald-400 font-black bg-emerald-500/10 tracking-wider shadow-[0_0_5px_rgba(16,185,129,0.3)] flex items-center gap-[1px] whitespace-nowrap"><Zap size={6}/> EV</span>}
        </div>
        <div className="flex flex-col items-center justify-center mt-2.5">
          <Car size={18} className="mb-[1px] text-gray-600/80" />
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] bg-[#0b0e16] text-gray-200 font-sans relative overflow-hidden"
         style={{
           backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
           backgroundSize: '30px 30px'
         }}>

      {/* Main Map Container */}
      <div className="flex-1 overflow-auto relative p-8 map-container">
        
        <style>{`
          ::-webkit-scrollbar { display: none; }
          * { -ms-overflow-style: none; scrollbar-width: none; }
          .map-container { perspective: 1200px; }
          .map-plane {
            transform-style: preserve-3d;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-panel {
            background: rgba(24, 28, 35, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
          }
          .slot-card {
            border-width: 1px;
            border-style: solid;
            border-radius: 0.5rem;
            transition: all 0.2s;
          }
          .traffic-lane {
            background-color: #12151c;
            border-style: dashed;
            border-color: rgba(255,255,255,0.3);
            box-shadow: 0 0 10px rgba(255,255,255,0.05) inset;
          }
          .lane-arrow {
            position: absolute;
            color: rgba(255,255,255,0.8);
            filter: drop-shadow(0 0 5px rgba(255,255,255,0.8));
          }
          .arrow-up { animation: flow-up 2s linear infinite; }
          .arrow-down { animation: flow-down 2s linear infinite; }
          .arrow-right { animation: flow-right 2s linear infinite; }
          
          @keyframes flow-up { 0% { transform: translateY(15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-15px); opacity: 0; } }
          @keyframes flow-down { 0% { transform: translateY(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(15px); opacity: 0; } }
          @keyframes flow-right { 0% { transform: translateX(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(15px); opacity: 0; } }

          .planter {
            display: flex;
            align-items: center;
            justify-content: space-evenly;
          }
        `}</style>

        {/* Zoom Controls */}
        <div className="absolute bottom-14 right-8 flex flex-row gap-2 z-50">
          <button onClick={handleZoomIn} title="Zoom In" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"><ZoomIn size={20} /></button>
          <button onClick={handleResetZoom} title="Reset View" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"><Maximize size={20} /></button>
          <button onClick={handleZoomOut} title="Zoom Out" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"><ZoomOut size={20} /></button>
        </div>

        <div className="map-plane w-[1000px] h-[600px] mx-auto relative origin-top mt-2 mb-10" style={{ transform: `rotateX(25deg) scale(${zoom})` }}>
          
          {/* LANES */}
          <div className="absolute left-0 top-0 bottom-0 w-16 traffic-lane border-r-2 z-0 flex flex-col items-center justify-start rounded-tl-[3rem] rounded-bl-xl">
            <ChevronsDown size={24} className="lane-arrow arrow-down top-[40%]" />
            <ChevronsDown size={24} className="lane-arrow arrow-down top-[70%]" />
            <div className="absolute top-[32px] left-0 w-full flex flex-col items-center z-10">
              <div className="w-14 h-2 bg-green-500 shadow-[0_0_20px_#22c55e] mb-1"></div>
              <div className="bg-[#181c23] w-[60px] text-center py-1 border border-green-500 text-[8px] text-green-400 font-black rounded shadow-[0_0_15px_rgba(34,197,94,0.4)] tracking-wider">ENTRANCE</div>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-16 traffic-lane border-l-2 z-0 flex flex-col items-center justify-start rounded-tr-[3rem] rounded-br-xl">
            <ChevronsDown size={24} className="lane-arrow arrow-down top-[30%]" />
            <ChevronsDown size={24} className="lane-arrow arrow-down top-[60%]" />
            <div className="absolute bottom-[32px] right-0 w-full flex flex-col items-center z-10">
              <div className="w-14 h-2 bg-red-500 shadow-[0_0_20px_#ef4444] mb-1"></div>
              <div className="bg-[#181c23] w-[60px] text-center py-1 border border-red-500 text-[8px] text-red-400 font-black rounded shadow-[0_0_15px_rgba(239,68,68,0.4)] tracking-wider">EXIT</div>
            </div>
          </div>

          <div className="absolute left-16 right-16 top-0 h-16 traffic-lane border-b-2 z-0 flex items-center justify-center">
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[20%]" />
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[50%]" />
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[80%]" />
          </div>

          <div className="absolute left-16 right-16 top-[280px] h-16 traffic-lane border-y-2 z-0 flex items-center justify-center">
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[30%]" />
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[70%]" />
          </div>

          <div className="absolute left-16 right-16 bottom-0 h-16 traffic-lane border-t-2 z-0 flex items-center justify-center">
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[25%]" />
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[50%]" />
            <ChevronsRight size={24} className="lane-arrow arrow-right left-[75%]" />
          </div>

          {/* PLANTERS */}
          <div className="absolute left-[72px] top-[80px] w-6 h-[190px] planter flex-col py-4">
             <TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" />
          </div>
          <div className="absolute left-[72px] top-[360px] w-6 h-[160px] planter flex-col py-4">
             <TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" />
          </div>
          <div className="absolute right-[72px] top-[80px] w-6 h-[190px] planter flex-col py-4">
             <TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" />
          </div>
          <div className="absolute right-[72px] top-[360px] w-6 h-[160px] planter flex-col py-4">
             <TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" /><TreePine size={18} className="text-[#25a55a] drop-shadow-[0_0_5px_#25a55a]" />
          </div>

          {/* TOP ROW ZONES */}
          <div className="absolute left-[108px] right-[108px] top-[80px] h-[190px] flex gap-8 z-20">
            <div className="glass-panel flex-1 p-4 relative border-amber-500/30 transition-all shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-500"><Star size={16} /><h3 className="font-bold tracking-widest text-xs uppercase text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">Zone A • VIP</h3></div>
                <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">Occ: 80%</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(14)].map((_, i) => {
                  const id = `A${(i+1).toString().padStart(2, '0')}`;
                  let type = 'empty';
                  let timeStatus = 'normal';
                  
                  if (i === 1) { type = 'hourly'; timeStatus = 'overstay'; }
                  else if (i === 5) { type = 'hourly'; timeStatus = 'warning'; }
                  else if ([0, 2, 4, 7, 8, 9, 10, 11, 12].includes(i)) type = 'monthly';
                  
                  return (
                    <div key={id} onClick={() => handleSlotClick(id, type, i, '30A', timeStatus)} className={`slot-card p-1 flex flex-col items-center justify-center h-12 relative group ${type !== 'empty' ? 'border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10' : 'border-amber-500 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.1)_inset]'}`}>
                      {renderSlotContent(id, type, i, '30A', 'text-amber-400', timeStatus)}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel flex-1 p-4 relative border-emerald-500/30 transition-all shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-emerald-400"><Zap size={16} /><h3 className="font-bold tracking-widest text-xs uppercase text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">Zone D • EV</h3></div>
                <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">Occ: 30%</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(14)].map((_, i) => {
                  const id = `D${(i+1).toString().padStart(2, '0')}`;
                  let type = 'empty';
                  let timeStatus = 'normal';

                  if (i === 4) type = 'charging';
                  else if ([1, 8].includes(i)) type = 'monthly';
                  else if (i === 12) { type = 'hourly'; timeStatus = 'overstay'; }
                  else if (i === 13) { type = 'hourly'; timeStatus = 'normal'; }

                  return (
                    <div key={id} onClick={() => handleSlotClick(id, type, i, '51F', timeStatus)} className={`slot-card p-1 flex flex-col items-center justify-center h-12 relative group ${type !== 'empty' ? 'border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10' : 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.1)_inset]'}`}>
                      {type === 'charging' && <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 w-[65%] shadow-[0_0_5px_#10b981]"></div>}
                      {renderSlotContent(id, type, i, '51F', 'text-emerald-400', timeStatus)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTTOM ROW ZONES */}
          <div className="absolute left-[108px] right-[108px] top-[360px] h-[160px] flex gap-8 z-20">
            <div className="glass-panel flex-1 p-4 relative border-purple-500/20 transition-all shadow-[0_0_40px_rgba(168,85,247,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-400"><Car size={16} /><h3 className="font-bold tracking-widest text-xs uppercase text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">Zone B • Mixed</h3></div>
                <span className="text-[9px] font-semibold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">Occ: 45%</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(14)].map((_, i) => {
                  const id = `B${(i+1).toString().padStart(2, '0')}`;
                  let type = 'empty';
                  let timeStatus = 'normal';

                  if (i === 6) { type = 'hourly'; timeStatus = 'warning'; }
                  else if (i === 7) { type = 'hourly'; timeStatus = 'normal'; }
                  else if ([8, 9].includes(i)) type = 'monthly';

                  return (
                    <div key={id} onClick={() => handleSlotClick(id, type, i, '29C', timeStatus)} className={`slot-card p-1 flex flex-col items-center justify-center h-12 relative group ${type !== 'empty' ? 'border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10' : 'border-purple-500 bg-purple-500/5 shadow-[0_0_10px_rgba(168,85,247,0.1)_inset]'}`}>
                      {renderSlotContent(id, type, i, '29C', 'text-purple-400', timeStatus)}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel flex-1 p-4 relative border-purple-500/20 transition-all shadow-[0_0_40px_rgba(168,85,247,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-400"><Car size={16} /><h3 className="font-bold tracking-widest text-xs uppercase text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">Zone C • Mixed</h3></div>
                <span className="text-[9px] font-semibold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">Occ: 60%</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(14)].map((_, i) => {
                  const id = `C${(i+1).toString().padStart(2, '0')}`;
                  let type = 'empty';
                  let timeStatus = 'normal';

                  if (i === 7) { type = 'hourly'; timeStatus = 'overstay'; }
                  else if (i === 8) { type = 'hourly'; timeStatus = 'warning'; }
                  else if (i > 8) type = 'monthly';

                  return (
                    <div key={id} onClick={() => handleSlotClick(id, type, i, '43A', timeStatus)} className={`slot-card p-1 flex flex-col items-center justify-center h-12 relative group ${type !== 'empty' ? 'border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10' : 'border-purple-500 bg-purple-500/5 shadow-[0_0_10px_rgba(168,85,247,0.1)_inset]'}`}>
                      {renderSlotContent(id, type, i, '43A', 'text-purple-400', timeStatus)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SLIDE-OVER PANEL ================= */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${selectedSlot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setSelectedSlot(null)}
      ></div>

      <div className={`absolute top-0 right-0 bottom-0 w-[420px] bg-[#0f172a]/80 backdrop-blur-2xl border-l border-cyan-500/20 p-8 flex flex-col shadow-[-20px_0_50px_rgba(8,145,178,0.1)] text-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${selectedSlot ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedSlot && (
          <>
            {/* HEADER */}
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

            <hr className="border-slate-700/50 mb-6" />

            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="mb-8">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Customer Info</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">License Plate</span>
                        <span className="font-mono text-base font-semibold text-white bg-slate-800/80 px-3 py-1 rounded border border-slate-700/50">{selectedSlot.plate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Owner</span>
                        <span className="font-medium text-white">{selectedSlot.owner}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Phone</span>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{selectedSlot.phone}</span>
                            <button className="w-7 h-7 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/20 transition-colors">
                                <Phone size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHI TIẾT ĐỖ XE */}
            <div className="mb-8 flex-1">
                <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Parking Details</h3>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Time Slot</span>
                        <span className="font-medium text-white text-sm">{selectedSlot.timeRange}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Entry Log</span>
                        <span className="font-mono text-white text-sm">{selectedSlot.entryTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Status</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${selectedSlot.paymentStatus === 'Paid' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>{selectedSlot.paymentStatus}</span>
                    </div>
                </div>

                {/* TỔNG TIỀN */}
                <div className="mt-6 bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-5 flex flex-col items-center justify-center gap-1 shadow-[inset_0_0_20px_rgba(8,145,178,0.05)]">
                    <span className="text-cyan-500/80 text-xs font-bold uppercase tracking-wider">Total Fee</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{selectedSlot.fee.split(' ')[0]}</span>
                        <span className="text-cyan-400/60 text-sm font-medium">{selectedSlot.fee.split(' ').slice(1).join(' ')}</span>
                    </div>
                </div>
            </div>

            {/* NÚT THAO TÁC */}
            <div className="flex flex-col gap-3 mt-auto">
                <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] group">
                    <LogOut size={18} className="group-hover:rotate-90 transition-transform" />
                    MANUAL CHECK-OUT
                </button>
                <button className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-bold tracking-wider uppercase transition-colors">
                    Cancel Booking (No-Show)
                </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
