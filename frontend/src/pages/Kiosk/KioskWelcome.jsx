import React, { useState, useRef, useEffect } from 'react';
import { Pointer, Loader2 } from 'lucide-react';
import backgroundImage from '../../assets/images/Kiosk/BackgroundWelcomeKiosk.png';
import logoImage from '../../assets/images/Kiosk/LogoKiosk.png';

export default function KioskWelcome({ onStart, updateFormData }) {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const formatVietnamesePlate = (plate) => {
    if (!plate) return '';
    // Clean up all non-alphanumeric
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Match standard Vietnamese plate format: [2 digits][1-2 letters][4-5 digits]
    const match = clean.match(/^(\d{2}[A-Z]{1,2})(\d{4,5})$/);
    
    if (match) {
      const prefix = match[1];
      const numbers = match[2];
      
      if (numbers.length === 4) {
        return `${prefix}-${numbers}`;
      } else if (numbers.length === 5) {
        return `${prefix}-${numbers.slice(0,3)}.${numbers.slice(3)}`;
      }
    }
    
    // Fallback to raw string if it doesn't match standard format
    return clean;
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
        
        // Wait for video to start playing and camera to auto-focus (1.5s delay)
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setTimeout(resolve, 1500); 
          };
        });

        // Try scanning up to 3 times to ensure a good capture
        let success = false;
        for (let i = 0; i < 3; i++) {
          const result = await captureAndAnalyze();
          if (result) {
            if (updateFormData) {
              updateFormData({ licensePlate: formatVietnamesePlate(result) });
            }
            success = true;
            break;
          }
          // Wait 1 second before retrying
          await new Promise(r => setTimeout(r, 1000));
        }
        
        // Always proceed to next step, even if it failed 3 times (user can type manually)
        stopCamera();
        onStart();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      // Proceed manually if camera fails or is denied
      stopCamera();
      onStart();
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

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center blur-sm scale-105 opacity-90"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>

      {/* Hidden Video Element for silent capture */}
      <video ref={videoRef} className="hidden" playsInline muted />

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
          onClick={startSilentScan}
          disabled={isScanning}
          className={`mt-12 bg-[#FFEB00] hover:bg-[#FFE000] text-[#0f172a] font-black text-3xl px-16 py-6 rounded-full flex items-center gap-4 transition-all shadow-[0_15px_30px_rgba(255,235,0,0.4)] border border-[#F2D600] group min-w-[400px] justify-center ${isScanning ? 'opacity-80 cursor-wait' : 'hover:shadow-[0_20px_40px_rgba(255,235,0,0.6)] active:scale-95 active:shadow-md'}`}
        >
          {isScanning ? (
            <>
              <Loader2 size={36} className="animate-spin" /> Scanning...
            </>
          ) : (
            <>
              Click to start
              <Pointer size={36} className="transform -rotate-12 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>

      </div>
    </div>
  );
}
