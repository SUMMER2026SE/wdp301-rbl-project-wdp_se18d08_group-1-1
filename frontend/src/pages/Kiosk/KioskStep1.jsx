import React, { useState, useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';

export default function KioskStep1({ formData, updateFormData, onNext }) {
  const [activeField, setActiveField] = useState('phone');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!formData.licensePlate || formData.licensePlate === 'SCANNING...' || formData.licensePlate === 'TAP TO ENTER') {
      startSilentScan();
    }
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const formatVietnamesePlate = (plate) => {
    if (!plate) return null;
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let province, series, numbers;
    if (clean.length === 9) {
      if (/^\d{2}[A-Z]\d\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
      else if (/^\d{2}[A-Z]{2}\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
    } else if (clean.length === 8) {
      if (/^\d{2}[A-Z]\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 3); numbers = clean.slice(3); }
      else if (/^\d{2}[A-Z]\d\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
      else if (/^\d{2}[A-Z]{2}\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
    } else if (clean.length === 7) {
      if (/^\d{2}[A-Z]\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 3); numbers = clean.slice(3); }
    }
    if (province && series && numbers) {
      let formattedNumbers = numbers;
      if (numbers.length === 5) { formattedNumbers = `${numbers.slice(0,3)}.${numbers.slice(3)}`; }
      const isMotorbike = /\d/.test(series);
      if (isMotorbike) return `${province}-${series} ${formattedNumbers}`;
      else return `${province}${series} - ${formattedNumbers}`;
    }
    return null;
  };

  const startSilentScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setTimeout(resolve, 1500); 
          };
        });
        let success = false;
        for (let i = 0; i < 3; i++) {
          const rawResult = await captureAndAnalyze();
          if (rawResult) {
            const formatted = formatVietnamesePlate(rawResult);
            if (formatted) {
              updateFormData({ licensePlate: formatted });
              success = true;
              break;
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!success) {
          updateFormData({ licensePlate: '' }); // Let user type manually
        }
        stopCamera();
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      // Fallback
      updateFormData({ licensePlate: '' });
      stopCamera();
      setIsScanning(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      const response = await fetch('http://localhost:5001/api/ai/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });
      
      const data = await response.json();
      if (response.ok && data.success && data.plate) {
        return data.plate;
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
    return null;
  };

  const handleKeyClick = (key) => {
    if (activeField === 'phone') {
      const currentPhone = formData.phone || '';
      
      // Validation for Vietnamese mobile phone numbers
      if (currentPhone.length === 0 && key !== '0') return; // Must start with 0
      if (currentPhone.length === 1 && !['3', '5', '7', '8', '9'].includes(key)) return; // Valid 2nd digits
      
      if (currentPhone.length < 10) {
        updateFormData({ phone: currentPhone + key });
      }
    } else if (activeField === 'plate') {
      if ((formData.licensePlate || '').length < 15) {
        const currentRaw = (formData.licensePlate || '') + key;
        const clean = currentRaw.replace(/[^A-Z0-9]/g, '');
        const formatted = formatVietnamesePlate(clean);
        
        if (formatted) {
          updateFormData({ licensePlate: formatted });
        } else {
          updateFormData({ licensePlate: currentRaw.toUpperCase() });
        }
        setIsScanning(false);
      }
    }
  };

  const handleDelete = () => {
    if (activeField === 'phone' && (formData.phone || '').length > 0) {
      updateFormData({ phone: (formData.phone || '').slice(0, -1) });
    } else if (activeField === 'plate' && (formData.licensePlate || '').length > 0) {
      updateFormData({ licensePlate: (formData.licensePlate || '').slice(0, -1) });
    }
  };

  const handleSpace = () => {
    if (activeField === 'plate') {
       updateFormData({ licensePlate: (formData.licensePlate || '') + ' ' });
       setIsScanning(false);
    }
  };

  const renderNumpad = () => (
    <div className="w-[90%] mx-auto relative mt-2">
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
        className="absolute right-0 top-0 h-[116px] w-11 flex items-center justify-center border-2 border-[#0f172a] bg-white rounded-[14px] text-[#0f172a] hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all"
      >
        <Delete size={20} strokeWidth={2} />
      </button>
    </div>
  );

  const qwertyRows = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M','-','.']
  ];

  const renderKeyboard = () => (
    <div className="w-full mx-auto relative mt-2 flex flex-col gap-2">
      {qwertyRows.map((row, i) => (
        <div key={i} className={`flex justify-center gap-1.5 ${i === 1 ? 'px-3' : ''} ${i === 2 ? 'px-6' : ''}`}>
          {row.map(key => (
            <button
              key={key}
              onClick={() => handleKeyClick(key)}
              className="bg-[#0f172a] text-white text-lg font-bold rounded-lg h-[44px] flex-1 max-w-[44px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all shadow-sm"
            >
              {key}
            </button>
          ))}
          {i === 3 && (
             <button
               onClick={handleDelete}
               className="bg-white border-2 border-[#0f172a] text-[#0f172a] text-sm font-bold rounded-lg h-[44px] px-3 flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all shadow-sm ml-1"
             >
               <Delete size={20} strokeWidth={2} />
             </button>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1 px-10">
        <button
          onClick={handleSpace}
          className="bg-[#0f172a] text-white text-sm font-bold rounded-lg h-[44px] flex-1 flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all shadow-sm"
        >
          SPACE
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[650px] mx-auto pb-4">
      {/* Hidden Video for silent scanning */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* ─── Yellow Card Container (Flat & Soft) ─── */}
      <div className="bg-[#FFDF00] w-full rounded-[32px] py-6 px-4 sm:px-8 flex flex-col items-center transition-all duration-500">
        
        {/* License Plate Field */}
        <div className="w-full text-center mb-4">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-2 uppercase">
            License Plate Number
            {isScanning && <span className="ml-2 text-red-500 animate-pulse font-normal lowercase tracking-normal">(camera scanning...)</span>}
          </label>
          <div 
            className={`relative bg-white rounded-2xl h-[60px] flex items-center justify-center w-[90%] mx-auto transition-all border-2 cursor-pointer ${activeField === 'plate' ? 'border-[#0f172a] shadow-[0_4px_15px_rgba(0,0,0,0.05)]' : 'border-transparent'}`}
            onClick={() => setActiveField('plate')}
          >
            <span className={`text-2xl font-bold font-mono tracking-[0.2em] ${isScanning ? 'text-gray-400' : 'text-[#0f172a]'}`}>
              {isScanning ? 'SCANNING...' : (formData.licensePlate || 'TAP TO ENTER')}
            </span>
            {activeField === 'plate' && (
              <span className="w-0.5 h-[26px] bg-[#0f172a] animate-pulse ml-1"></span>
            )}
          </div>
        </div>

        {/* Phone Number Field */}
        <div className="w-full text-center mb-5">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-2 uppercase">Enter Phone</label>
          <div
            className={`relative bg-white rounded-2xl h-[60px] flex items-center justify-center px-6 w-[90%] mx-auto transition-all border-2 cursor-pointer ${activeField === 'phone' ? 'border-[#0f172a] shadow-[0_4px_15px_rgba(0,0,0,0.05)]' : 'border-transparent'}`}
            onClick={() => setActiveField('phone')}
          >
            <div className="flex items-center justify-center w-full font-mono text-3xl font-bold pl-[0.2em]">
              <span className="text-[#0f172a] tracking-[0.2em]">{formData.phone || ''}</span>
              {/* Dynamic blinking cursor */}
              {activeField === 'phone' && (
                <span className="w-0.5 h-[30px] bg-[#0f172a] animate-pulse -ml-[0.1em] mr-[0.1em]"></span>
              )}
              <span className="text-gray-300 tracking-[0.2em]">
                {'0123456789'.slice((formData.phone || '').length)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Keyboard based on active field */}
        {activeField === 'phone' ? renderNumpad() : renderKeyboard()}

      </div>

      {/* Next Step Button */}
      <button
        onClick={onNext}
        disabled={(formData.phone || '').length !== 10 || isScanning}
        className={`mt-6 mb-2 font-bold text-[18px] px-16 py-[16px] rounded-full transition-all border-2 ${
          ((formData.phone || '').length !== 10 || isScanning || !(formData.licensePlate || ''))
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#0f172a] border-[#0f172a] text-white hover:bg-black shadow-[0_10px_20px_rgba(0,0,0,0.2)] active:scale-95'
        }`}
      >
        Next step
      </button>
    </div>
  );
}
