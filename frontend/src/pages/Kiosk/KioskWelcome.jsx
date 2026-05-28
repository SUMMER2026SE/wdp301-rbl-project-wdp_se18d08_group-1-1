import React from 'react';
import { Pointer } from 'lucide-react';
import backgroundImage from '../../assets/images/Kiosk/BackgroundWelcomeKiosk.png';
import logoImage from '../../assets/images/Kiosk/LogoKiosk.png';

export default function KioskWelcome({ onStart, updateFormData }) {
  const handleStart = () => {
    // Navigate to step 1 immediately
    onStart();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center blur-sm scale-105 opacity-90"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>

      {/* Main Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md w-[85%] max-w-[1000px] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] p-16 flex flex-col items-center">
        
        <div className="absolute top-5 right-0 w-44">
          <img src={logoImage} alt="Valo Parking" className="w-full h-auto object-contain" />
        </div>

        <div className="w-full text-left mt-8 mb-10">
          <h2 className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">WELCOME TO</h2>
          <h1
            className="text-[100px] font-black tracking-tight leading-none text-[#FFEB00]"
            style={{ textShadow: '2px 4px 10px rgba(0,0,0,0.3), 1px 1px 0px #0f172a' }}
          >
            VALO PARKING
          </h1>
          <p className="text-2xl font-bold text-gray-600 mt-6 tracking-wide">
            Fast, Secure, and Fully Automated Experience
          </p>
        </div>

        <button
          onClick={handleStart}
          className="mt-12 bg-[#FFEB00] hover:bg-[#FFE000] text-[#0f172a] font-black text-3xl px-16 py-6 rounded-full flex items-center gap-4 transition-all shadow-[0_15px_30px_rgba(255,235,0,0.4)] border border-[#F2D600] group min-w-[400px] justify-center hover:shadow-[0_20px_40px_rgba(255,235,0,0.6)] active:scale-95 active:shadow-md"
        >
          Click to start
          <Pointer size={36} className="transform -rotate-12 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
        </button>

      </div>
    </div>
  );
}
