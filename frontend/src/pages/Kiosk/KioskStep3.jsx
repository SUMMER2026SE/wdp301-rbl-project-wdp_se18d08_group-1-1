import React, { useState } from 'react';
import { Clock, CreditCard, Car, RefreshCw, ShieldCheck, Ban, ShieldAlert, Check } from 'lucide-react';

export default function KioskStep3({ formData, onConfirm, onBack }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col flex-1 w-full max-w-[800px] mx-auto pb-0 font-sans h-full justify-between">
      
      {/* ─── POLICIES GRID ─── */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
        
        <PolicyItem 
          icon={<Clock className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
          title="1. PARKING DURATION"
          text="Parking is charged hourly and calculated from the time of entry to exit. Minimum booking time is 1 hour."
        />
        <PolicyItem 
          icon={<CreditCard className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
          title="2. PAYMENT POLICY"
          text="Payment must be made in full before entry. Accepted payment methods: Card, E-wallet, QR Code. No cash accepted."
        />
        <PolicyItem 
          icon={<Car className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
          title="3. VEHICLE RESPONSIBILITY"
          text="Please ensure your vehicle is locked and remove all valuables. The management is not responsible for any loss or damage."
        />
        <PolicyItem 
          icon={<RefreshCw className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
          title="4. CANCELLATION & REFUND"
          text="Free cancellation is available up to 30 minutes before your booking start time. No refund for late cancellation or no-show."
        />
        <PolicyItem 
          icon={<ShieldCheck className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
          title="5. SAFETY & SECURITY"
          text="The parking area is monitored by 24/7 CCTV and security personnel. For your safety, please follow all instructions."
        />
        <PolicyItem 
          icon={<Ban className="text-gray-400" size={20} strokeWidth={1.5} />}
          title="6. PROHIBITED ACTIONS"
          text="No smoking, no open flames, and no hazardous materials. Please do not block driveways or other vehicles."
        />

      </div>

      {/* ─── IMPORTANT NOTES ─── */}
      <div className="bg-[#fffdf5] border border-[#f5eec2] rounded-xl p-3 flex items-center gap-4 mb-4">
        <div className="flex flex-col items-center shrink-0 w-[70px]">
          <div className="w-8 h-8 bg-[#FFDF00] rounded-lg flex items-center justify-center mb-1">
            <ShieldAlert size={16} className="text-gray-900" strokeWidth={2} />
          </div>
          <span className="text-[8px] font-bold uppercase text-center w-full leading-tight tracking-wider text-[#0f172a]">Important<br/>Notes</span>
        </div>
        
        <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-1 flex-1">
          <li>Please arrive on time. Your booking will be held for 15 minutes after the start time.</li>
          <li>Overstay will be charged at the standard hourly rate.</li>
          <li>By confirming, you agree to our terms and conditions.</li>
        </ul>

        <div className="bg-[#fff9d6] p-2.5 rounded-xl text-[9px] text-gray-700 flex items-start gap-2 w-52 shrink-0 border border-[#f5eec2]">
          <span className="font-bold text-lg text-[#0f172a] leading-none">!</span>
          <p className="leading-tight">Failure to comply with these policies may result in additional charges or booking cancellation.</p>
        </div>
      </div>

      {/* ─── CHECKBOX ─── */}
      <div 
        className="flex items-center justify-center gap-3 cursor-pointer group mb-2"
        onClick={() => setAgreed(!agreed)}
      >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${agreed ? 'bg-[#0f172a] border-[#0f172a] text-[#FFDF00]' : 'border-gray-300 bg-white group-hover:border-gray-500'}`}>
          {agreed && <Check size={14} strokeWidth={4} />}
        </div>
        <p className="font-semibold text-[11px] text-gray-700 leading-tight">
          By selecting "Confirm", you acknowledge that you have read, understood, and agree to abide by the above parking policies and terms.
        </p>
      </div>

      {/* ─── BOTTOM BUTTONS ─── */}
      <div className="flex justify-center gap-4 mt-auto mb-1">
        <button 
          onClick={onBack}
          className="flex items-center justify-center gap-2 bg-transparent text-[#0f172a] font-bold text-[16px] px-8 py-2.5 rounded-full border-2 border-[#0f172a] hover:bg-gray-50 transition-all w-40"
        >
          Back
        </button>
        <button 
          onClick={onConfirm}
          disabled={!agreed}
          className={`flex items-center justify-center text-[16px] font-bold px-8 py-2.5 rounded-full transition-all border-2 w-40 ${
            !agreed 
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-[#0f172a] border-[#0f172a] text-white hover:bg-black shadow-[0_4px_10px_rgba(0,0,0,0.2)] active:scale-95'
          }`}
        >
          Confirm
        </button>
      </div>

    </div>
  );
}

function PolicyItem({ icon, title, text }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white mb-2 shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold text-[10px] tracking-wider text-[#0f172a] mb-1">{title}</h4>
      <p className="text-[9px] text-gray-500 leading-tight px-1">{text}</p>
    </div>
  );
}
