import { useEffect } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function KioskOutSuccess({ onFinish }) {
  useEffect(() => {
    // Auto return to welcome after 5 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Celebration background elements */}
      <div className="absolute inset-0 bg-yellow-500/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/20 blur-[100px] rounded-full" />
      
      <div className="z-10 flex flex-col items-center animate-float">
        <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(234,179,8,0.5)]">
          <CheckCircle2 size={80} className="text-black" />
        </div>
        
        <h1 className="text-5xl font-black text-white mb-4 tracking-wider text-center drop-shadow-lg">
          THANH TOÁN THÀNH CÔNG
        </h1>
        
        <p className="text-xl text-yellow-400 font-semibold mb-8 flex items-center gap-2">
          <ShieldCheck /> BARRIER ĐANG MỞ
        </p>

        <p className="text-gray-400 text-lg">
          Chúc quý khách thượng lộ bình an!
        </p>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 animate-[scan_5s_linear_forwards]" style={{ width: '100%' }} />
    </div>
  );
}
