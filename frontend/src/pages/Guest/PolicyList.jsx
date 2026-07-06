import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { getPolicies } from '../../services/policyService';

const categoryLabel = (value = '') =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Policy';

export default function PolicyList() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPolicies()
      .then((res) => {
        if (res.ok && res.data?.success) {
          setPolicies(res.data.data || []);
        } else {
          setError(res.data?.message || 'Unable to load policies.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(
    () =>
      policies.reduce((acc, policy) => {
        const category = policy.category || 'other';
        acc[category] = acc[category] || [];
        acc[category].push(policy);
        return acc;
      }, {}),
    [policies]
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-gold">
            <ShieldCheck size={14} />
            VALO Policies
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-950 md:text-5xl">
            Policies and terms
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Review the latest published policies that govern VALO Parking services, bookings, wallet use, and customer safety.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white py-20 text-sm font-bold text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading policies
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">{error}</div>
        ) : policies.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            No published policies are available yet.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                  {categoryLabel(category)}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((policy) => (
                    <Link
                      key={policy._id}
                      to={`/policies/${policy.slug}`}
                      className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                          <FileText size={22} />
                        </div>
                        <ArrowRight size={18} className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gold" />
                      </div>
                      <h3 className="text-xl font-black text-gray-950">
                        {policy.currentVersion?.title || policy.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                        {policy.currentVersion?.summary || policy.description || 'Read the latest published policy.'}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          Version {policy.currentVersionNumber}
                        </span>
                        {policy.requiresAcceptance && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                            Acceptance required
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
