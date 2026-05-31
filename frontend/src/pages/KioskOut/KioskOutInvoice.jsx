import { useState, useEffect } from 'react';
import { Camera, Clock, CreditCard, ChevronRight, AlertTriangle, Wallet, Image as ImageIcon } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

export default function KioskOutInvoice({ sessionData, exitImage, onCheckoutSuccess, onBack }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (paymentMethod) => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:5000/api/sessions/kiosk-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData?.session?._id,
          exitImageBase64: exitImage,
          paymentMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        onCheckoutSuccess();
      } else {
        alert(data.message);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // If AutoPay is allowed, auto-trigger checkout
    if (sessionData && sessionData.canAutoPay) {
      handleCheckout('wallet');
    }
  }, [sessionData]);

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>No session data</p>
      </div>
    );
  }

  const { session, durationHours, expectedHours, totalPrice, walletBalance, canAutoPay } = sessionData;

  // If AutoPay, show a loading screen while it processes
  if (canAutoPay) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
        <div className="w-20 h-20 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-8" />
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">Processing Auto-Pay (ETC)...</h2>
        <p className="text-gray-400">Please wait while we verify your wallet and open the barrier.</p>
      </div>
    );
  }

  // Format currency
  const formatVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#0D0D0D]">
      
      {/* LEFT: Dual Screen Camera View */}
      <div className="flex-1 bg-black flex flex-col border-r border-white/10">
        <div className="p-6 bg-gradient-to-b from-black to-transparent">
          <h2 className="text-2xl font-black text-white tracking-widest flex items-center gap-3">
            <Camera className="text-yellow-400" /> CAMERA VERIFICATION
          </h2>
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-center gap-6">
          <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 bg-yellow-500 text-black font-bold px-3 py-1 text-xs rounded-br-lg z-10">ENTRY CAMERA</div>
            {session.entryImage_url ? (
              <img src={session.entryImage_url} alt="Entry" className="w-full h-[30vh] object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="w-full h-[30vh] flex items-center justify-center text-gray-600"><ImageIcon size={48} /></div>
            )}
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 bg-yellow-500 text-black font-bold px-3 py-1 text-xs rounded-br-lg z-10">EXIT CAMERA (LIVE)</div>
            {exitImage ? (
              <img src={exitImage} alt="Exit" className="w-full h-[30vh] object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="w-full h-[30vh] flex items-center justify-center text-gray-600"><ImageIcon size={48} /></div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Invoice & Payment */}
      <div className="w-full md:w-[450px] bg-[#111] flex flex-col">
        <div className="p-8 flex-1 overflow-y-auto">
          <h2 className="text-3xl font-black text-white mb-2">CHECKOUT</h2>
          <p className="text-gray-400 text-sm mb-8">Please review your parking details and complete payment.</p>

          <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6 mb-6">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
              <div>
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">LICENSE PLATE</p>
                <p className="text-2xl font-black text-yellow-400 tracking-wider">{session.licensePlate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">SLOT</p>
                <p className="text-xl font-bold text-white">{session.parkingSlot || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 flex items-center gap-2"><Clock size={16}/> Expected Duration</span>
                <span className="font-bold">{expectedHours} hrs</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 flex items-center gap-2"><Clock size={16}/> Actual Duration</span>
                <span className={`font-bold ${durationHours > expectedHours ? 'text-red-400' : 'text-white'}`}>{durationHours} hrs</span>
              </div>
              
              {durationHours > expectedHours && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-2 flex items-start gap-3">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-red-400 font-semibold text-xs">OVERTIME PENALTY</p>
                    <p className="text-gray-300 text-xs mt-1">You exceeded your booked time by {durationHours - expectedHours} hours. A 30% penalty rate is applied to the extra hours.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-end">
              <span className="text-gray-400 text-sm font-semibold">TOTAL AMOUNT</span>
              <span className="text-4xl font-black text-yellow-400">{formatVND(totalPrice)}</span>
            </div>
          </div>

          {/* Wallet Status Box (If User) */}
          {session.userId && (
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-5 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="text-blue-400" />
                <div>
                  <p className="text-xs text-blue-400 font-semibold">VALO WALLET BALANCE</p>
                  <p className="text-lg font-bold text-white">{formatVND(walletBalance)}</p>
                </div>
              </div>
              {/* Wallet is insufficient based on the logic evaluated in backend */}
              <p className="text-xs text-red-400 font-semibold max-w-[120px] text-right">
                Insufficient limit. Please use QR to pay.
              </p>
            </div>
          )}

          {/* QR Code Section */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-black">
            <p className="font-bold text-sm mb-4">SCAN TO PAY</p>
            <QRCode value={`VALOPARKING-${session._id}-${totalPrice}`} size={160} />
            <p className="text-xs text-gray-500 mt-4 text-center">Use any banking app to scan and pay.</p>
          </div>
        </div>

        <div className="p-6 bg-[#0D0D0D] border-t border-white/5 flex gap-4 shrink-0">
          <button 
            onClick={onBack}
            className="px-6 py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          
          <button 
            onClick={() => handleCheckout('qr')}
            disabled={isProcessing}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'CONFIRM PAYMENT'} <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
