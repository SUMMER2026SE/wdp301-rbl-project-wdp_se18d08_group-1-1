import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function KioskFastPass({ formData, isMonthly, onComplete }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete(); // Auto complete after 5 seconds
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white text-[#0f172a] p-12 rounded-[32px] shadow-2xl flex flex-col items-center max-w-[600px] w-full text-center relative overflow-hidden border border-gray-100">
        
        {/* Top green decoration */}
        <div className="absolute top-0 left-0 w-full h-3 bg-green-500"></div>

        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-8 shadow-inner border border-green-200">
          <CheckCircle size={56} strokeWidth={2.5} />
        </div>
        
        <h2 className="text-3xl font-black text-[#0f172a] mb-3 uppercase tracking-tight">
          Welcome Back!
        </h2>
        
        <p className="text-gray-500 text-center mb-10 text-lg leading-relaxed">
          Your vehicle <span className="font-bold text-[#0f172a] mx-1">{formData.licensePlate}</span> is recognized as a <br/>
          <span className="font-bold text-cyan-600">
            {isMonthly ? 'Monthly Subscriber' : 'Pre-booked Guest'}
          </span>.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 w-full mb-10 shadow-sm relative overflow-hidden flex justify-between items-center">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-cyan-500"></div>
          
          <div className="flex flex-col text-left pl-4">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <ShieldCheck size={18} />
              <span className="font-bold uppercase tracking-wider text-[10px]">Fast-Pass Verified</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Assigned Slot</p>
          </div>
          
          <div className="text-right">
            <p className="text-5xl font-black text-[#0f172a] leading-none tracking-tighter">
              {formData.selectedSlot || '--'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center bg-green-50 w-full py-4 rounded-2xl border border-green-100">
          <div className="flex items-center gap-3 text-green-600 font-bold text-xl mb-1">
            <span>Barrier is opening</span>
            <ArrowRight className="animate-pulse" size={24} />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Screen will automatically close in {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
}
