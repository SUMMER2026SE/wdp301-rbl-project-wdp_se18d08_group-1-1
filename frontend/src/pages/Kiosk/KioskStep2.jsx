import React from 'react';
import { Info, CheckCircle2 } from 'lucide-react';

export default function KioskStep2({ formData, updateFormData, onNext, onBack }) {
  // Simplified 2D Map placeholder for Kiosk
  const handleDurationChange = (delta) => {
    const newVal = formData.durationHours + delta;
    if (newVal >= 1 && newVal <= 24) {
      updateFormData({ durationHours: newVal });
    }
  };

  const estimatedCharge = formData.durationHours * 6; // Mock rate $6/hr

  return (
    <div className="flex flex-col flex-1 w-full max-w-[850px] mx-auto pb-0 relative h-full">
      
      <div className="flex-1 flex gap-4">
        
        {/* ─── 2D MAP PLACEHOLDER ─── */}
        <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] py-4 px-6 flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-400 mb-1 tracking-wide uppercase">Interactive 2D Map</h3>
            <p className="text-xs text-gray-400">Select a parking slot to continue</p>
          </div>
          
          {/* Mock Grid */}
          <div className="grid grid-cols-4 gap-3 w-full px-2">
             {[1,2,3,4,5,6,7,8].map(i => (
               <div 
                 key={i} 
                 onClick={() => updateFormData({ selectedSlot: `S-20${i}` })}
                 className={`relative h-12 rounded-[14px] border-2 flex items-center justify-center cursor-pointer transition-all ${
                   formData.selectedSlot === `S-20${i}` 
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm scale-105' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                 }`}
               >
                 <span className="font-bold text-sm whitespace-nowrap">S-20{i}</span>
                 {formData.selectedSlot === `S-20${i}` && (
                   <div className="absolute -top-2 -right-2 bg-white rounded-full">
                     <CheckCircle2 size={18} className="text-blue-500" />
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>

        {/* ─── SLOT DETAILS SIDEBAR ─── */}
        <div className="w-[320px] bg-white rounded-[32px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex flex-col">
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider">SLOT DETAILS</h3>
            <Info size={16} className="text-blue-500" strokeWidth={2} />
          </div>

          <div className="mb-3">
            <p className="text-[10px] text-gray-400 mb-0.5">Slot ID</p>
            <p className="text-2xl font-black text-blue-600 tracking-wide">{formData.selectedSlot || '--'}</p>
          </div>

          <div className="space-y-3 mb-4 border-b border-gray-100 pb-4">
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-500">Zone</span>
              <span className="font-bold text-[#0f172a]">Standard Zone</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-500">Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${formData.selectedSlot ? 'text-white bg-blue-500' : 'text-gray-400 bg-gray-100'}`}>
                {formData.selectedSlot ? 'Selected' : 'None'}
              </span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-500">Price</span>
              <span className="font-bold text-[#0f172a]">$6.00 / hour</span>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="mb-3">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">DURATION (HOURS)</p>
            <div className="flex items-center justify-between border-2 border-gray-100 rounded-2xl p-1 h-[44px]">
              <button 
                onClick={() => handleDurationChange(-1)}
                className="w-10 h-full flex items-center justify-center bg-transparent rounded-xl text-xl font-bold hover:bg-gray-50 active:bg-gray-100 text-gray-600 transition-all"
              >
                -
              </button>
              <div className="flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[#0f172a] leading-none">{formData.durationHours.toString().padStart(2, '0')}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">hour(s)</span>
              </div>
              <button 
                onClick={() => handleDurationChange(1)}
                className="w-10 h-full flex items-center justify-center bg-transparent rounded-xl text-xl font-bold hover:bg-gray-50 active:bg-gray-100 text-gray-600 transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* Estimated Charge */}
          <div className="mt-auto bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Estimated Charge</p>
            <p className="text-xl font-black text-[#0f172a]">${estimatedCharge.toFixed(2)}</p>
            <p className="text-[8px] text-gray-400 mt-1">Minimum 1 hour booking</p>
          </div>

        </div>

      </div>

      {/* ─── BOTTOM BUTTONS ─── */}
      <div className="flex justify-center gap-4 mt-3 mb-1">
        <button 
          onClick={onBack}
          className="flex items-center justify-center gap-2 bg-transparent text-[#0f172a] font-bold text-[16px] px-8 py-3 rounded-full border-2 border-[#0f172a] hover:bg-gray-50 transition-all w-40"
        >
          Back
        </button>
        <button 
          onClick={onNext}
          disabled={!formData.selectedSlot}
          className={`flex items-center justify-center text-[16px] font-bold px-8 py-3 rounded-full transition-all border-2 w-40 ${
            !formData.selectedSlot 
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-[#0f172a] border-[#0f172a] text-white hover:bg-black shadow-[0_6px_15px_rgba(0,0,0,0.2)] active:scale-95'
          }`}
        >
          Next step
        </button>
      </div>

    </div>
  );
}
