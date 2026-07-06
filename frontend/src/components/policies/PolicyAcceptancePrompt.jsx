import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, X } from 'lucide-react';
import { acceptPolicy } from '../../services/policyService';

export default function PolicyAcceptancePrompt({
  open = false,
  missingPolicies = null,
  onClose,
  onAccepted,
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const rawUser = sessionStorage.getItem('valo_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const items = missingPolicies || [];

  const handleAcceptAll = async () => {
    if (!items.length) {
      onAccepted?.();
      onClose?.();
      return;
    }

    setAccepting(true);
    setError('');

    try {
      for (const policy of items) {
        const res = await acceptPolicy(policy.policyId);
        if (!res.ok || !res.data?.success) {
          throw new Error(res.data?.message || `Unable to accept ${policy.title}`);
        }
      }

      onAccepted?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Unable to accept policies.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950">Policy acceptance required</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Please accept the latest required policy versions before continuing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-white hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              All required policies are already accepted.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((policy) => (
                <a
                  key={policy.policyId}
                  href={`/policies/${policy.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gold/40 hover:bg-amber-50/40"
                >
                  <FileText size={18} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="font-black text-gray-900">{policy.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Version {policy.versionNumber}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={accepting || user?.role !== 'customer'}
            onClick={handleAcceptAll}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {accepting && <Loader2 size={16} className="animate-spin" />}
            Accept and continue
          </button>
        </div>
      </div>
    </div>
  );
}
