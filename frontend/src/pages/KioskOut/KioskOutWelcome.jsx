import { useRef, useEffect, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, ScanLine, Car, AlertCircle } from 'lucide-react';

export default function KioskOutWelcome({ onScanSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [manualInput, setManualInput] = useState('');

  // Start webcam
  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setStreamError(true);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handlePlateDetected = async (plate, imageBase64) => {
    try {
      const res = await fetch('http://localhost:5000/api/sessions/kiosk-exit-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate: plate })
      });
      const data = await res.json();
      if (data.success) {
        onScanSuccess(data.data, imageBase64);
      } else {
        // Not found, maybe continue scanning or show error
        console.warn(data.message);
      }
    } catch (err) {
      console.error("API error", err);
    }
  };

  // Tesseract OCR Loop
  useEffect(() => {
    let interval;
    if (!streamError && videoRef.current) {
      interval = setInterval(async () => {
        if (isScanning) return; // Prevent overlapping scans

        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          setIsScanning(true);
          try {
            const { data: { text } } = await Tesseract.recognize(
              canvas,
              'eng',
              { logger: m => {} } // silences the logger
            );
            
            const cleanedText = text.replace(/[^A-Z0-9-.]/g, '');
            setRecognizedText(cleanedText);

            // Very simple Regex for VN License plate (e.g., 51H-595.65)
            // Just matching some generic pattern like 2 digits + 1 letter + dash + digits
            const plateRegex = /\d{2}[A-Z]-\d{3}\.?\d{2}/;
            const match = text.match(plateRegex);
            
            if (match) {
              const detectedPlate = match[0];
              clearInterval(interval);
              handlePlateDetected(detectedPlate, canvas.toDataURL('image/jpeg', 0.8));
            }

          } catch (err) {
            console.error("OCR Error:", err);
          } finally {
            setIsScanning(false);
          }
        }
      }, 1500); // Scan every 1.5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamError, isScanning]);

  // Manual fallback for Tester
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput) {
      // Capture current frame anyway
      let imageBase64 = null;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      }
      handlePlateDetected(manualInput, imageBase64);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden">
      
      {/* Live Camera Background */}
      {streamError ? (
        <div className="flex flex-col items-center justify-center text-red-400 z-10">
          <AlertCircle size={48} className="mb-4" />
          <p>Cannot access Camera.</p>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      )}
      
      {/* Hidden Canvas for OCR */}
      <canvas ref={canvasRef} className="hidden" />

      {/* AI Scanner UI Overlay */}
      <div className="z-10 flex flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-wider drop-shadow-lg">
            EXIT KIOSK
          </h1>
          <p className="text-gray-300 text-lg flex items-center gap-2 drop-shadow-md">
            <Camera size={20} className="text-yellow-400" />
            Vui lòng tiến xe vào khu vực quét biển số
          </p>
        </div>

        {/* Scanner Crosshair Box */}
        <div className="relative w-72 h-40 md:w-96 md:h-56 border-2 border-yellow-400/50 rounded-2xl flex items-center justify-center overflow-hidden">
          {/* Scanning Line Animation */}
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 shadow-[0_0_15px_3px_rgba(250,204,21,0.6)] animate-scan" />
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />

          {/* Center icon */}
          <ScanLine size={48} className={`text-yellow-400/30 ${isScanning ? 'animate-pulse' : ''}`} />
        </div>

        {/* OCR Debug Info (For demonstration) */}
        {recognizedText && (
          <p className="mt-4 text-xs font-mono text-gray-500">AI Reading: {recognizedText}</p>
        )}
      </div>

      {/* Tester Fallback Input (Subtle) */}
      <form 
        onSubmit={handleManualSubmit}
        className="absolute bottom-10 z-20 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity"
      >
        <p className="text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-widest">Tester / Fallback Input</p>
        <div className="flex items-center gap-2">
          <input 
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value.toUpperCase())}
            placeholder="e.g. 51H-595.65"
            className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button 
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-400 text-black p-2 rounded-lg transition-colors"
          >
            <Car size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
