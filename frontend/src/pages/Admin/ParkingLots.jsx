import React, { useEffect, useState } from "react";
import { Car, Zap, Star, ZoomIn, ZoomOut, Maximize } from "lucide-react";

export default function ParkingLots() {
  const [zoom, setZoom] = useState(0.8);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
  const handleResetZoom = () => setZoom(0.8);

  useEffect(() => {
    // Optionally add a class to body for specific map background
    document.body.classList.add("bg-[#0b0e16]");
    return () => {
      document.body.classList.remove("bg-[#0b0e16]");
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e16] text-gray-200 font-sans relative overflow-hidden"
         style={{
           backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
           backgroundSize: '30px 30px'
         }}>

      {/* Main Map Container */}
      <div className="flex-1 overflow-auto relative p-8 map-container">
        
        {/* Custom Styles for Map Elements */}
        <style>{`
          /* Hide Scrollbars */
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .map-container { perspective: 1200px; }
          .map-plane {
            transform-style: preserve-3d;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .map-plane:hover {
            /* optional hover effect removed so it doesn't conflict with zoom */
          }
          .glass-panel {
            background: rgba(24, 28, 35, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
          }
          .slot-card {
            border: 1px dashed rgba(255,255,255,0.2);
            border-radius: 0.5rem;
            transition: all 0.2s;
          }
          .slot-card.occupied { border-style: solid; background: rgba(255,255,255,0.05); }
          .slot-card.booked { border-color: #f59e0b; border-style: solid; }
          .slot-card.charging { border-color: #10b981; border-style: solid; box-shadow: 0 0 10px rgba(16, 185, 129, 0.2) inset; }
          .lane-marker-y {
            position: absolute; width: 4px; height: 24px; background: rgba(255,255,255,0.15); left: 50%; transform: translateX(-50%); border-radius: 2px;
          }
          .lane-marker-x {
            position: absolute; width: 24px; height: 4px; background: rgba(255,255,255,0.15); top: 50%; transform: translateY(-50%); border-radius: 2px;
          }
          .flow-line-y {
            position: absolute; width: 2px; height: 60px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(180deg, transparent, rgba(255,255,255,0.8), transparent);
          }
          .flow-line-x {
            position: absolute; height: 2px; width: 60px; top: 50%; transform: translateY(-50%);
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          }
        `}</style>

        {/* Zoom Controls */}
        <div className="absolute bottom-8 right-8 flex flex-row gap-2 z-50">
          <button onClick={handleZoomIn} title="Zoom In" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95">
            <ZoomIn size={20} />
          </button>
          <button onClick={handleResetZoom} title="Reset View" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95">
            <Maximize size={20} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" className="p-3 bg-[#181c23] hover:bg-white/10 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105 active:scale-95">
            <ZoomOut size={20} />
          </button>
        </div>

        <div className="map-plane w-[1000px] h-[600px] mx-auto relative origin-top mt-2 mb-10" style={{ transform: `rotateX(25deg) scale(${zoom})` }}>
          
          {/* ═════════ TRAFFIC LANES ═════════ */}

          {/* 1. Left Vertical Lane (ENTRANCE) - Flow UP */}
          <div className="absolute left-0 top-0 bottom-0 w-16 border-r-2 border-dashed border-white/20 bg-[#10131b]/60 backdrop-blur-sm z-0 flex flex-col items-center justify-end pb-4 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="w-full flex justify-center relative mt-auto">
              <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
              <div className="absolute bottom-6 text-[10px] font-black text-green-400 tracking-[0.2em] whitespace-nowrap -rotate-90 origin-right -translate-x-4">CỔNG VÀO</div>
              <div className="w-12 h-2.5 bg-green-500 rounded shadow-[0_0_15px_#22c55e]"></div>
              
              {/* LPR Scanner */}
              <div className="absolute bottom-16 w-full h-8 border-y border-green-500/30 overflow-hidden bg-green-500/5">
                <div className="w-full h-1 bg-green-400 absolute animate-scan shadow-[0_0_10px_#4ade80]"></div>
              </div>
            </div>
            {/* Flow UP markers */}
            <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
              <div className="lane-marker-y bottom-0 animate-flow-up"></div>
              <div className="lane-marker-y bottom-[33%] animate-flow-up" style={{animationDelay: '0.6s'}}></div>
              <div className="lane-marker-y bottom-[66%] animate-flow-up" style={{animationDelay: '1.2s'}}></div>
              
              <div className="flow-line-y bottom-0 animate-flow-up" style={{animationDelay: '0.3s'}}></div>
              <div className="flow-line-y bottom-[50%] animate-flow-up" style={{animationDelay: '1.0s'}}></div>
            </div>
          </div>

          {/* 2. Top Horizontal Lane - Flow RIGHT */}
          <div className="absolute left-16 right-16 top-0 h-16 border-b-2 border-dashed border-white/20 bg-[#10131b]/40 z-0 overflow-hidden flex items-center justify-center">
            {/* Flow RIGHT markers */}
            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
              <div className="lane-marker-x left-0 animate-flow-right"></div>
              <div className="lane-marker-x left-[25%] animate-flow-right" style={{animationDelay: '0.5s'}}></div>
              <div className="lane-marker-x left-[50%] animate-flow-right" style={{animationDelay: '1s'}}></div>
              <div className="lane-marker-x left-[75%] animate-flow-right" style={{animationDelay: '1.5s'}}></div>
              
              <div className="flow-line-x left-0 animate-flow-right" style={{animationDelay: '0.2s'}}></div>
              <div className="flow-line-x left-[40%] animate-flow-right" style={{animationDelay: '0.8s'}}></div>
              <div className="flow-line-x left-[80%] animate-flow-right" style={{animationDelay: '1.4s'}}></div>
            </div>
            {/* Turn indicators */}
            <div className="absolute left-4 w-12 h-12 border-t-4 border-l-4 border-white/10 rounded-tl-3xl"></div>
            <div className="absolute right-4 w-12 h-12 border-t-4 border-r-4 border-white/10 rounded-tr-3xl"></div>
          </div>

          {/* 3. Right Vertical Lane (EXIT) - Flow DOWN */}
          <div className="absolute right-0 top-0 bottom-0 w-16 border-l-2 border-dashed border-white/20 bg-[#10131b]/60 backdrop-blur-sm z-0 flex flex-col items-center justify-start pt-4 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="w-full flex justify-center relative mb-auto">
              <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
              <div className="absolute top-6 text-[10px] font-black text-red-400 tracking-[0.2em] whitespace-nowrap rotate-90 origin-left translate-x-4">CỔNG RA</div>
              <div className="w-12 h-2.5 bg-red-500 rounded shadow-[0_0_15px_#ef4444]"></div>
              
              {/* LPR Scanner */}
              <div className="absolute top-16 w-full h-8 border-y border-red-500/30 overflow-hidden bg-red-500/5">
                <div className="w-full h-1 bg-red-400 absolute animate-scan shadow-[0_0_10px_#f87171]"></div>
              </div>
            </div>
            {/* Flow DOWN markers */}
            <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
              <div className="lane-marker-y top-0 animate-flow-down"></div>
              <div className="lane-marker-y top-[33%] animate-flow-down" style={{animationDelay: '0.6s'}}></div>
              <div className="lane-marker-y top-[66%] animate-flow-down" style={{animationDelay: '1.2s'}}></div>
              
              <div className="flow-line-y top-0 animate-flow-down" style={{animationDelay: '0.3s'}}></div>
              <div className="flow-line-y top-[50%] animate-flow-down" style={{animationDelay: '1.0s'}}></div>
            </div>
          </div>

          {/* 4. Middle Horizontal Lane - Flow RIGHT */}
          <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-16 border-y-2 border-dashed border-white/20 bg-[#10131b]/40 z-0 overflow-hidden flex items-center justify-center">
            {/* Flow RIGHT markers */}
            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
              <div className="lane-marker-x left-0 animate-flow-right"></div>
              <div className="lane-marker-x left-[25%] animate-flow-right" style={{animationDelay: '0.5s'}}></div>
              <div className="lane-marker-x left-[50%] animate-flow-right" style={{animationDelay: '1s'}}></div>
              <div className="lane-marker-x left-[75%] animate-flow-right" style={{animationDelay: '1.5s'}}></div>
              
              <div className="flow-line-x left-[10%] animate-flow-right" style={{animationDelay: '0.4s'}}></div>
              <div className="flow-line-x left-[60%] animate-flow-right" style={{animationDelay: '1.2s'}}></div>
            </div>
            <div className="absolute left-4 w-12 h-12 border-b-4 border-l-4 border-white/10 rounded-bl-3xl"></div>
            <div className="absolute right-4 w-12 h-12 border-t-4 border-r-4 border-white/10 rounded-tr-3xl"></div>
          </div>

          {/* 5. Bottom Horizontal Lane (Optional padding/boundary) */}
          <div className="absolute left-16 right-16 bottom-0 h-4 border-t border-white/10 bg-[#10131b]/80 z-0"></div>


          {/* ═════════ PARKING ZONES ═════════ */}
          <div className="absolute left-20 right-20 top-20 bottom-6 flex flex-col z-20 pointer-events-none">
            
            {/* TOP ROW ZONES (Between Top Lane and Middle Lane) */}
            <div className="flex gap-6 flex-1 mb-8">
              
              {/* Zone A: VIP */}
              <div className="glass-panel flex-1 p-4 relative pointer-events-auto border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-amber-500">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg"><Star size={18} /></div>
                    <h3 className="font-bold tracking-widest text-xs uppercase">Zone A • VIP </h3>
                  </div>
                  <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full border border-amber-500/20">Occupancy: 80%</span>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(14)].map((_, i) => {
                    const id = `A${(i+1).toString().padStart(2, '0')}`;
                    const isBooked = i === 2;
                    const isOccupied = [0, 4, 7, 8, 9, 10, 11, 12].includes(i);
                    return (
                      <div key={id} className={`slot-card p-1.5 flex flex-col items-center justify-center h-12 cursor-pointer relative overflow-hidden group
                        ${isBooked ? 'booked animate-pulse-glow' : isOccupied ? 'occupied' : 'opacity-60 hover:opacity-100 hover:bg-white/5 hover:border-white/40'}`}>
                        {isBooked && <div className="absolute inset-0 bg-amber-500/10"></div>}
                        {isOccupied && <Car size={18} className="absolute text-gray-500/30" />}
                        <span className={`text-[10px] font-bold relative z-10 ${isBooked ? 'text-amber-500' : isOccupied ? 'text-gray-500' : 'text-gray-300'}`}>{id}</span>
                        <span className={`text-[8px] mt-0.5 relative z-10 font-semibold ${isBooked ? 'text-amber-500/80' : isOccupied ? 'text-gray-600' : 'text-gray-500'}`}>
                          {isBooked ? 'BOOKED' : isOccupied ? 'VÉ THÁNG' : 'TRỐNG'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zone D: EV Charging */}
              <div className="glass-panel flex-1 p-4 relative pointer-events-auto border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-xl pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Zap size={18} /></div>
                    <h3 className="font-bold tracking-widest text-xs uppercase">Zone D • EV Charging</h3>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">Occupancy: 30%</span>
                </div>
                
                <div className="grid grid-cols-7 gap-2 relative z-10">
                  {[...Array(14)].map((_, i) => {
                    const id = `D${(i+1).toString().padStart(2, '0')}`;
                    const isCharging = i === 4;
                    const isOccupied = i === 1 || i === 8;
                    return (
                      <div key={id} className={`slot-card p-1.5 flex flex-col items-center justify-center h-12 cursor-pointer relative overflow-hidden group
                        ${isCharging ? 'charging bg-emerald-500/10' : isOccupied ? 'occupied' : 'opacity-60 hover:opacity-100 hover:bg-white/5 border-emerald-500/30'}`}>
                        {isCharging && <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-[65%] shadow-[0_0_8px_#10b981]"></div>}
                        {isOccupied && <Car size={18} className="absolute text-gray-500/30" />}
                        <span className={`text-[10px] font-bold ${isCharging ? 'text-emerald-400' : isOccupied ? 'text-gray-500' : 'text-emerald-400/70'}`}>{id}</span>
                        {isCharging ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Zap size={8} className="text-emerald-400 animate-charge" />
                            <span className="text-[8px] font-bold text-emerald-400">65%</span>
                          </div>
                        ) : (
                          <span className={`text-[8px] mt-0.5 font-semibold ${isOccupied ? 'text-gray-600' : 'text-emerald-400/50'}`}>
                            {isOccupied ? 'ĐÃ ĐỖ' : 'EV TRỐNG'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>


            {/* BOTTOM ROW ZONES (Below Middle Lane) */}
            <div className="flex gap-6 flex-1 mt-6">
              
              {/* Zone B: Mixed */}
              <div className="glass-panel flex-[0.85] p-4 relative pointer-events-auto border-purple-500/10 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-purple-400">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg"><Car size={18} /></div>
                    <h3 className="font-bold tracking-widest text-xs uppercase">Zone B • Mixed </h3>
                  </div>
                  <span className="text-[10px] font-semibold bg-gray-500/10 text-gray-400 px-2 py-1 rounded-full border border-gray-500/20">Occupancy: 45%</span>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(14)].map((_, i) => {
                    const id = `B${(i+1).toString().padStart(2, '0')}`;
                    const isMonth = i === 0 || i === 2;
                    const isHour = i === 1;
                    const isOccupied = i > 5 && i < 10;
                    return (
                      <div key={id} className={`slot-card p-2 flex flex-col items-center justify-center h-16 relative cursor-pointer group
                        ${isOccupied ? 'occupied' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>
                        {(isMonth || isHour) && !isOccupied && (
                           <span className={`absolute -top-2 px-1 rounded text-[8px] font-bold border
                             ${isMonth ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                             {isMonth ? 'THÁNG' : 'GIỜ'}
                           </span>
                        )}
                        {isOccupied && <Car size={24} className="absolute text-gray-500/30" />}
                        <span className={`text-xs font-bold relative z-10 ${isOccupied ? 'text-gray-500' : 'text-gray-300'}`}>{id}</span>
                        <span className={`text-[9px] mt-1 relative z-10 font-semibold ${isOccupied ? 'text-gray-600' : 'text-gray-500'}`}>
                          {isOccupied ? 'ĐÃ ĐỖ' : 'TRỐNG'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zone C: Mixed */}
              <div className="glass-panel flex-1 p-4 relative pointer-events-auto border-purple-500/10 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-purple-400">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg"><Car size={18} /></div>
                    <h3 className="font-bold tracking-widest text-xs uppercase">Zone C • Mixed </h3>
                  </div>
                  <span className="text-[10px] font-semibold bg-gray-500/10 text-gray-400 px-2 py-1 rounded-full border border-gray-500/20">Occupancy: 60%</span>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(14)].map((_, i) => {
                    const id = `C${(i+1).toString().padStart(2, '0')}`;
                    const isHour = i < 7 && i !== 2;
                    const isMonth = i === 2;
                    const isOccupied = i >= 7;
                    return (
                      <div key={id} className={`slot-card p-2 flex flex-col items-center justify-center h-16 relative cursor-pointer group
                        ${isOccupied ? 'occupied' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>
                        {(isMonth || isHour) && !isOccupied && (
                           <span className={`absolute -top-2 px-1 rounded text-[8px] font-bold border
                             ${isMonth ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                             {isMonth ? 'THÁNG' : 'GIỜ'}
                           </span>
                        )}
                        {isOccupied && <Car size={24} className="absolute text-gray-500/30" />}
                        <span className={`text-xs font-bold relative z-10 ${isOccupied ? 'text-gray-500' : 'text-gray-300'}`}>{id}</span>
                        <span className={`text-[9px] mt-1 relative z-10 font-semibold ${isOccupied ? 'text-gray-600' : 'text-gray-500'}`}>
                          {isOccupied ? 'ĐÃ ĐỖ' : 'TRỐNG'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
