import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Zap, Camera, Car, CreditCard, ArrowRight, Smartphone, QrCode } from 'lucide-react';

// Import hình ảnh
import CarImage from '../../assets/images/car.png';

// Import Component 3D
import SmartGate3D from '../../components/SmartGate3D';

export default function GuestHome() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
        <div className="w-full lg:w-1/2 flex flex-col items-start z-10">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold tracking-wider mb-6 uppercase">
            <Zap size={14} className="text-yellow-600" /> AI Recognition System 2.0
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            The New Era of<br />
            <span className="text-gold-gradient">Smart Parking.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
            Touchless check-in with AI Cameras. Preview parking availability in real-time. One-touch payment via VALO Wallet.
          </p>
          <div className="w-full max-w-md bg-white p-2 rounded-xl shadow-xl border border-gray-100 flex gap-2 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center pl-3 text-gray-400">
              <Search size={20} />
            </div>
            <input type="text" placeholder="Enter license plate (e.g., 43A-123.45)..." className="flex-1 bg-transparent px-2 py-3 outline-none text-gray-700 font-semibold placeholder-gray-400" />
            <button className="bg-charcoal text-white px-6 py-3 rounded-lg font-bold hover:bg-black hover:scale-105 transition-all whitespace-nowrap">Check</button>
          </div>
        </div>

        <div className="w-full lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gold-gradient opacity-10 blur-3xl rounded-full transform -translate-y-10"></div>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 relative overflow-hidden scan-line group">
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
              <div>
                <h3 className="font-bold text-lg text-charcoal">Live Grid Map (50%)</h3>
                <p className="text-xs text-gray-400">Current parking status</p>
              </div>
              <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-green-100">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> 12/50 Available
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 relative">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-gray-400">A-01</span><Car size={24} className="text-gray-600 mt-2" /></div>
              <div className={`bg-white border-2 border-green-400 rounded-lg p-3 h-24 flex flex-col justify-center items-center cursor-pointer transition-all duration-300 ${pulse ? 'shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}><span className="text-xs font-bold text-green-600">A-02</span><span className="text-[10px] font-bold text-green-500 mt-2 uppercase tracking-wider bg-green-50 px-2 py-1 rounded">Empty</span></div>
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-yellow-700">A-03</span><span className="text-[10px] font-bold text-yellow-600 mt-2 uppercase tracking-wider">Booked</span></div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-gray-400">A-04</span><Car size={24} className="text-gray-600 mt-2" /></div>
              <div className={`bg-white border-2 border-green-400 rounded-lg p-3 h-24 flex flex-col justify-center items-center cursor-pointer transition-all duration-300 ${!pulse ? 'shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}><span className="text-xs font-bold text-green-600">A-05</span><span className="text-[10px] font-bold text-green-500 mt-2 uppercase tracking-wider bg-green-50 px-2 py-1 rounded">Empty</span></div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-gray-400">A-06</span><Car size={24} className="text-gray-600 mt-2" /></div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-gray-400">A-07</span><Car size={24} className="text-gray-600 mt-2" /></div>
              <div className="bg-charcoal border border-gray-800 rounded-lg p-3 h-24 flex flex-col justify-center items-center"><span className="text-xs font-bold text-gray-500">A-08</span><span className="text-[10px] font-bold text-white mt-2 uppercase tracking-wider text-center">Maintain</span></div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6">
              <button className="bg-charcoal text-white font-bold py-3 px-8 rounded-full text-sm shadow-xl hover:-translate-y-1 hover:shadow-2xl transition transform flex items-center gap-2 border border-gray-700">
                <ShieldCheck size={16} className="text-gold" /> Log in to view 100% of the map
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION MỚI: 3D AI GATE CHECK-IN (REACT THREE FIBER) */}
      <section className="bg-charcoal text-white py-24 relative overflow-hidden border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
          
          <div className="w-full lg:w-1/2">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-gold text-xs font-bold tracking-wider mb-6 uppercase">
              <Camera size={14} /> Seamless Check-in
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-6">
              Automated <span className="text-gold-gradient">ALPR Gate</span>
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Experience the magic of 100% touchless entry. Just drive up to the barrier. Our AI cameras instantly read your license plate, cross-check your booking, and open the gate in less than a second.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0">✓</div>
                High-speed recognition (0.5s response time).
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0">✓</div>
                No tickets, no stopping, no windows down.
              </li>
            </ul>
          </div>

          <div className="w-full lg:w-1/2 relative">
             <SmartGate3D />
             {/* Ánh sáng trang trí nền phía sau */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gold-gradient opacity-10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
          </div>

        </div>
      </section>

      {/* 3. SHOWCASE CAR & DUAL RECOGNITION */}
      <section className="py-20 bg-white border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 relative animate-drive-in">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl animate-hover-car bg-gray-100 min-h-[400px]">
              <img src={CarImage} alt="Smart Parking Vehicle" className="w-full h-full object-cover absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-mono text-sm tracking-widest">ALPR SCANNING ACTIVE</span>
                </div>
                <h3 className="text-white text-2xl font-bold font-mono tracking-widest">43A - 123.45</h3>
              </div>
            </div>
            <div className="absolute top-10 -right-10 w-full h-full bg-gold-gradient opacity-10 rounded-2xl -z-10 transform rotate-3"></div>
          </div>

          <div className="w-full lg:w-1/2">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 text-charcoal">
              The Power of <span className="text-gold-gradient">Dual Recognition</span>
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We don't just rely on AI Cameras. VALO features cross-validation between Gate Cameras and Dynamic Mobile QRs, ensuring absolute security for your vehicle.
            </p>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start group">
                <div className="w-12 h-12 rounded-full bg-charcoal text-gold flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-lg group-hover:text-gold transition-colors">Ultra-fast AI Camera (1s)</h4>
                  <p className="text-gray-500 text-sm">Multi-thread analysis, recognizing plates the moment your car touches the line.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start group">
                <div className="w-12 h-12 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <QrCode size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-lg group-hover:text-yellow-700 transition-colors">Dynamic QR Backup</h4>
                  <p className="text-gray-500 text-sm">QR codes refresh every 30s. 100% risk prevention during camera weather disruptions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="bg-charcoal text-white py-24 relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4"><span className="text-gold-gradient">Touchless</span> Experience</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Just 2 seconds to pass the gate. VALO's technology completely eliminates traditional paper tickets and cash.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: <Smartphone size={28}/>, title: "Book Slot", desc: "Open the VALO app, select your preferred parking slot and time." },
              { step: "02", icon: <Camera size={28}/>, title: "AI Plate Scan", desc: "Drive to the gate, the camera automatically recognizes your plate in 1s." },
              { step: "03", icon: <Car size={28}/>, title: "Park", desc: "The barrier opens automatically. Proceed to your designated slot." },
              { step: "04", icon: <CreditCard size={28}/>, title: "Exit", desc: "The system auto-deducts from your Wallet or VNPay." }
            ].map((item, index) => (
              <div key={index} className="relative group h-full cursor-pointer">
                <div className="bg-[#1A1A1A] border border-gray-800 p-8 rounded-2xl relative z-10 transition-all duration-500 h-full flex flex-col justify-between overflow-hidden group-hover:-translate-y-3 group-hover:border-[#D4AF37]/50 group-hover:shadow-[0_15px_40px_rgba(212,175,55,0.15)]">
                  <div className="text-9xl font-extrabold text-white/5 absolute -top-8 -right-4 z-0 transition-colors duration-500 group-hover:text-gold/10 select-none pointer-events-none">
                    {item.step}
                  </div>
                  <div className="relative z-10">
                    <div className="text-gold mb-6 bg-gold/10 w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      {item.icon}
                    </div>
                    <h4 className="text-xl font-bold mb-3 text-white">{item.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                {index < 3 && <ArrowRight className="hidden md:block absolute top-1/2 -right-6 text-gray-700 z-20 transform -translate-y-1/2 group-hover:text-gold transition-colors duration-300" />}
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}