import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../services/api';

export default function StaffCheckoutModal({ isOpen, onClose, session, onSuccess }) {
  const [step, setStep] = useState('camera'); // 'camera', 'scanning', 'invoice', 'submitting', 'success'
  const [exitImageBase64, setExitImageBase64] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen && step === 'camera') {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setErrorMsg('');
    } catch (err) {
      console.error('Camera access denied or error:', err);
      setErrorMsg('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setExitImageBase64(dataUrl);
    stopCamera();
    handleExitScan();
  };

  const handleExitScan = async () => {
    setStep('scanning');
    setErrorMsg('');
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/sessions/kiosk-exit-scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ licensePlate: session.licensePlate })
      });
      const data = await res.json();
      
      if (!data.success) {
        setErrorMsg(data.message || 'Failed to scan exit');
        setStep('camera');
        return;
      }

      setInvoiceData(data);
      setStep('invoice');
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while processing check-out.');
      setStep('camera');
    }
  };

  const handleConfirmCheckout = async () => {
    setStep('submitting');
    setErrorMsg('');
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/sessions/kiosk-checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sessionId: session._id,
          exitImageBase64,
          paymentMethod
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        setErrorMsg(data.message || 'Failed to check out');
        setStep('invoice');
        return;
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while finalizing check-out.');
      setStep('invoice');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-[#181c23] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Check size={16} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-wide uppercase text-sm">Process Check-out</h3>
              <p className="text-xs text-gray-400 font-mono">SLOT: {session.parkingSlot || '--'} • PLATE: {session.licensePlate}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors border border-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 relative min-h-[400px] flex flex-col">
          
          {errorMsg && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {step === 'camera' && (
            <div className="flex flex-col flex-1">
              <div className="relative flex-1 bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[300px]">
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-500/50 m-8 rounded-xl" />
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-wider border border-white/10">
                    ALIGN VEHICLE & CAPTURE
                  </span>
                </div>
              </div>
              <button 
                onClick={capturePhoto}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold uppercase tracking-wider py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                Capture Photo
              </button>
            </div>
          )}

          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center flex-1 py-12">
              <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Calculating Price</h3>
              <p className="text-sm text-gray-400">Verifying session duration and pricing...</p>
            </div>
          )}

          {step === 'invoice' && invoiceData && (
            <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-4 flex-1">
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                  <span className="text-gray-400 text-sm">Check-in Time</span>
                  <span className="text-white font-medium">{new Date(session.checkInTime).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                  <span className="text-gray-400 text-sm">Duration</span>
                  <span className="text-white font-medium">{invoiceData.remainingHours || invoiceData.durationHours || 0} hours</span>
                </div>
                
                {invoiceData.isSubActive ? (
                   <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 my-2 text-center">
                     <p className="text-purple-400 font-bold uppercase text-sm tracking-wider">VIP Subscription Active</p>
                     <p className="text-xs text-purple-300 mt-1">This checkout is fully covered by VIP membership.</p>
                   </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                      <span className="text-gray-400 text-sm">Base Price</span>
                      <span className="text-white font-medium">{(invoiceData.amountToPay || 0).toLocaleString()} VND</span>
                    </div>
                    {invoiceData.refundAmount > 0 && (
                      <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                        <span className="text-emerald-400 text-sm font-bold">Refund Due</span>
                        <span className="text-emerald-400 font-bold">+{invoiceData.refundAmount.toLocaleString()} VND</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-300 font-bold uppercase tracking-wide">Final Amount</span>
                  <span className="text-3xl font-black text-emerald-400">{(invoiceData.amountToPay || 0).toLocaleString()} VND</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</label>
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-semibold outline-none focus:border-emerald-500/50 transition-colors"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">CASH</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="POS">POS CARD</option>
                </select>
              </div>

              <button 
                onClick={handleConfirmCheckout}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold uppercase tracking-wider py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
              >
                Confirm Payment & Checkout
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center flex-1 py-12">
              <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Processing</h3>
              <p className="text-sm text-gray-400">Finalizing checkout and opening gate...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/50 mb-6">
                <Check size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Checkout Success</h3>
              <p className="text-gray-400">Vehicle is clear to exit.</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
