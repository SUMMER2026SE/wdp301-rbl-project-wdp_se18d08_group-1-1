import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { getPolicyBySlug, acceptPolicy } from '../../services/policyService';
import PolicyContent from './PolicyContent';

export default function BookingPolicyModal({ open, onClose, onConfirm, title = "Review Policies & Terms" }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [policyData, setPolicyData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      getPolicyBySlug('booking-policy')
        .then(res => {
          if (res.ok && res.data?.success) {
            setPolicyData(res.data.data);
          } else {
            setError(res.data?.message || 'Policy not found');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setAgreed(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-8 py-6 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-950 uppercase tracking-wide">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Please read and accept our policies before proceeding.
            </p>
          </div>
        </div>

        <div className="px-8 py-6 overflow-y-auto flex-1 bg-white">
          {loading ? (
             <div className="flex flex-col justify-center items-center py-20 gap-4">
               <Loader2 className="animate-spin text-gray-400" size={32} />
               <p className="text-sm text-gray-500 font-semibold">Loading policies...</p>
             </div>
          ) : error || !policyData ? (
             <div className="bg-red-50 text-red-700 p-5 rounded-2xl flex items-start gap-3 border border-red-100">
               <AlertCircle size={24} className="mt-0.5 shrink-0" />
               <div>
                 <h3 className="font-bold">Failed to load booking policy</h3>
                 <p className="text-sm mt-1">{error || 'The policy data could not be retrieved from the server. Please check the Admin Panel.'}</p>
               </div>
             </div>
          ) : (
             <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-6 shadow-sm">
               <PolicyContent policy={policyData} version={policyData.currentVersionId} />
             </div>
          )}

          <div 
            className="flex items-center gap-4 cursor-pointer group bg-[#fffdf5] border border-[#f5eec2] p-5 rounded-xl transition-colors hover:bg-[#fff9d6]"
            onClick={() => setAgreed(!agreed)}
          >
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${agreed ? 'bg-[#0f172a] border-[#0f172a] text-[#FFDF00]' : 'border-gray-300 bg-white group-hover:border-gray-500'}`}>
              {agreed && <Check size={18} strokeWidth={4} />}
            </div>
            <p className="font-bold text-[15px] text-gray-800 leading-tight">
              I acknowledge that I have read, understood, and agree to abide by the above parking policies and terms.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-gray-100 bg-gray-50 px-8 py-6 shrink-0">
          <button 
            onClick={onClose}
            disabled={submitting}
            className="px-8 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all focus:ring-4 focus:ring-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              if (!agreed) return;
              if (policyData?._id) {
                setSubmitting(true);
                try {
                  await acceptPolicy(policyData._id);
                } catch (err) {
                  console.error('Failed to accept policy', err);
                } finally {
                  setSubmitting(false);
                }
              }
              onConfirm();
            }}
            disabled={!agreed || submitting}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-sm focus:ring-4 focus:ring-gray-200 flex items-center gap-2 ${
              !agreed || submitting
                ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-[#0f172a] text-white hover:bg-black active:scale-95 shadow-md'
            }`}
          >
            {submitting && <Loader2 className="animate-spin" size={18} />}
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
