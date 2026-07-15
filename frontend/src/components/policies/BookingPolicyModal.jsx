import { useState } from 'react';
import { Check, Clock, CreditCard, Car, RefreshCw, ShieldCheck, Ban, ShieldAlert } from 'lucide-react';

export default function BookingPolicyModal({ open, onClose, onConfirm, title = "Review Policies & Terms" }) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-8 py-6">
          <div>
            <h2 className="text-xl font-black text-gray-950 uppercase tracking-wide">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Please read and accept our policies before proceeding.
            </p>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-6">
            <PolicyItem 
              icon={<Clock className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
              title="1. PARKING DURATION"
              text="Parking is charged hourly and calculated from the time of entry to exit. Minimum booking time is 1 hour."
            />
            <PolicyItem 
              icon={<CreditCard className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
              title="2. PAYMENT POLICY"
              text="Payment must be made in full before entry. Accepted payment methods: Card, E-wallet, QR Code. No cash accepted."
            />
            <PolicyItem 
              icon={<Car className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
              title="3. VEHICLE RESPONSIBILITY"
              text="Please ensure your vehicle is locked and remove all valuables. The management is not responsible for any loss or damage."
            />
            <PolicyItem 
              icon={<RefreshCw className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
              title="4. CANCELLATION & REFUND"
              text="Free cancellation is available up to 30 minutes before your booking start time. No refund for late cancellation or no-show."
            />
            <PolicyItem 
              icon={<ShieldCheck className="text-[#0f172a]" size={20} strokeWidth={1.5} />}
              title="5. SAFETY & SECURITY"
              text="The parking area is monitored by 24/7 CCTV and security personnel. For your safety, please follow all instructions."
            />
            <PolicyItem 
              icon={<Ban className="text-gray-400" size={20} strokeWidth={1.5} />}
              title="6. PROHIBITED ACTIONS"
              text="No smoking, no open flames, and no hazardous materials. Please do not block driveways or other vehicles."
            />
          </div>

          <div className="bg-[#fffdf5] border border-[#f5eec2] rounded-xl p-4 flex items-center gap-4 mb-6">
            <div className="flex flex-col items-center shrink-0 w-[80px]">
              <div className="w-10 h-10 bg-[#FFDF00] rounded-xl flex items-center justify-center mb-1">
                <ShieldAlert size={20} className="text-gray-900" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold uppercase text-center w-full leading-tight tracking-wider text-[#0f172a]">Important<br/>Notes</span>
            </div>
            
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1.5 flex-1">
              <li>Please arrive on time. Your booking will be held for 15 minutes after the start time.</li>
              <li>Overstay will be charged at the standard hourly rate.</li>
              <li>By confirming, you agree to our terms and conditions.</li>
            </ul>

            <div className="bg-[#fff9d6] p-3 rounded-xl text-xs text-gray-700 flex items-start gap-2 w-64 shrink-0 border border-[#f5eec2]">
              <span className="font-bold text-xl text-[#0f172a] leading-none">!</span>
              <p className="leading-tight">Failure to comply with these policies may result in additional charges or booking cancellation.</p>
            </div>
          </div>

          <div 
            className="flex items-center gap-3 cursor-pointer group bg-gray-50 border border-gray-100 p-4 rounded-xl"
            onClick={() => setAgreed(!agreed)}
          >
            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${agreed ? 'bg-[#0f172a] border-[#0f172a] text-[#FFDF00]' : 'border-gray-300 bg-white group-hover:border-gray-500'}`}>
              {agreed && <Check size={16} strokeWidth={4} />}
            </div>
            <p className="font-semibold text-sm text-gray-800 leading-tight">
              I acknowledge that I have read, understood, and agree to abide by the above parking policies and terms.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-gray-100 bg-gray-50 px-8 py-6">
          <button 
            onClick={onClose}
            className="px-8 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (agreed) onConfirm();
            }}
            disabled={!agreed}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-sm ${
              !agreed 
                ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-[#0f172a] text-white hover:bg-black active:scale-95'
            }`}
          >
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyItem({ icon, title, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 shrink-0 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-xs tracking-wider text-[#0f172a] mb-1">{title}</h4>
        <p className="text-[11px] text-gray-500 leading-snug pr-2">{text}</p>
      </div>
    </div>
  );
}
