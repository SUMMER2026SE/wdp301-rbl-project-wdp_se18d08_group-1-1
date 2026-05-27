import React, { useState } from 'react';
import { Delete } from 'lucide-react';

export default function KioskStep1({ formData, updateFormData, onNext }) {
  const [activeField, setActiveField] = useState('phone'); // We assume license plate is auto-filled by AI camera

  const handleKeyClick = (key) => {
    if (activeField === 'phone') {
      if (formData.phone.length < 11) {
        updateFormData({ phone: formData.phone + key });
      }
    }
    // If they want to edit license plate, we can add logic here too
  };

  const handleDelete = () => {
    if (activeField === 'phone' && formData.phone.length > 0) {
      updateFormData({ phone: formData.phone.slice(0, -1) });
    }
  };

  // Mock initial license plate from AI Camera if it's empty
  React.useEffect(() => {
    if (!formData.licensePlate) {
      updateFormData({ licensePlate: '43B - 123.45' });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[650px] mx-auto pb-4">

      {/* ─── Yellow Card Container (Flat & Soft) ─── */}
      <div className="bg-[#FFDF00] w-full rounded-[32px] py-6 px-10 flex flex-col items-center">

        {/* License Plate Field */}
        <div className="w-full text-center mb-5">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-3 uppercase">License Plate Number</label>
          <div className="bg-white rounded-2xl h-[60px] flex items-center justify-center w-[85%] mx-auto">
            <span className="text-2xl font-bold font-mono tracking-[0.2em] text-[#0f172a]">
              {formData.licensePlate || 'SCANNING...'}
            </span>
          </div>
        </div>

        {/* Phone Number Field */}
        <div className="w-full text-center mb-5">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-3 uppercase">Enter Phone</label>
          <div
            className={`relative bg-white rounded-2xl h-[60px] flex items-center justify-center px-6 w-[85%] mx-auto transition-all border-2 ${activeField === 'phone' ? 'border-[#0f172a] shadow-[0_4px_15px_rgba(0,0,0,0.05)]' : 'border-transparent'}`}
            onClick={() => setActiveField('phone')}
          >
            <div className="flex items-center justify-center w-full font-mono text-3xl font-bold pl-[0.2em]">
              <span className="text-[#0f172a] tracking-[0.2em]">{formData.phone}</span>

              {/* Dynamic blinking cursor */}
              {activeField === 'phone' && (
                <span className="w-0.5 h-[30px] bg-[#0f172a] animate-pulse -ml-[0.1em] mr-[0.1em]"></span>
              )}

              <span className="text-gray-300 tracking-[0.2em]">
                {'0123456789'.slice(formData.phone.length)}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Numpad (Soft Navy) */}
        <div className="w-[90%] mx-auto relative">
          <div className="grid grid-cols-5 gap-3 mb-3 pr-14">
            {[0, 1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => handleKeyClick(num.toString())}
                className="bg-[#0f172a] text-white text-2xl font-bold rounded-[14px] h-[52px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-3 pr-14">
            {[5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyClick(num.toString())}
                className="bg-[#0f172a] text-white text-2xl font-bold rounded-[14px] h-[52px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Delete Button Absolute Right */}
          <button
            onClick={handleDelete}
            className="absolute right-0 top-0 h-[52px] w-11 flex items-center justify-center border border-[#0f172a] rounded-[14px] text-[#0f172a] hover:bg-black/5 active:bg-black/10 active:scale-95 transition-all"
          >
            <Delete size={20} strokeWidth={2} />
          </button>
        </div>

      </div>

      {/* Next Step Button */}
      <button
        onClick={onNext}
        disabled={formData.phone.length < 10}
        className={`mt-6 mb-2 font-bold text-[18px] px-16 py-[16px] rounded-full transition-all border-2 ${formData.phone.length < 10
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#0f172a] border-[#0f172a] text-white hover:bg-black shadow-[0_10px_20px_rgba(0,0,0,0.2)] active:scale-95'
          }`}
      >
        Next step
      </button>

    </div>
  );
}
